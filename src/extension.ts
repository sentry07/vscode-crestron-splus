import * as vscode from 'vscode';

let taskProvider: vscode.Disposable | undefined;
function activate(context: vscode.ExtensionContext) {
  let splus_format = vscode.commands.registerCommand('extension.splus_format', () => {
    fixIndentation();
  });

  let help_command = vscode.commands.registerCommand("extension.splus_help", () => {
    callShellCommand(vscode.workspace.getConfiguration("splus").helpLocation);
  });

  function rebuildTaskList(): void {
    if (taskProvider) {
      taskProvider.dispose();
      taskProvider = undefined;
    }
    if (!taskProvider && vscode.window.activeTextEditor.document.languageId === "splus-source") {
      let splusPromise: Thenable<vscode.Task[]> | undefined = undefined;
      taskProvider = vscode.tasks.registerTaskProvider('splus', {
        provideTasks: () => {
          if (!splusPromise) {
            splusPromise = getCompileTasks();
          }

          return splusPromise;
        },
        resolveTask: () => {
          return undefined;
        }
      })
    }
  }

  context.subscriptions.push(splus_format);
  context.subscriptions.push(help_command);

  vscode.workspace.onDidChangeConfiguration(rebuildTaskList);
  vscode.workspace.onDidOpenTextDocument(rebuildTaskList);
  vscode.window.onDidChangeActiveTextEditor(rebuildTaskList);
  rebuildTaskList();
}
exports.activate = activate;

// Creates a terminal, calls the command, then closes the terminal
function callShellCommand(shellCommand: string): void {
  let term = vscode.window.createTerminal('splus', vscode.workspace.getConfiguration("splus").terminalLocation);
  term.sendText("\"" + shellCommand + "\"", true);
  term.sendText("exit", true);
}

// Adds a folder to the workspace
function addFolderToWorkspace(folder: string, folderName: string): void {
  let folderLocation = vscode.Uri.file(folder);
  vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, null, { "uri": folderLocation, "name": folderName });
}

function countChars(haystack: string, needle: string): number {
  let count = 0;
  for (var i = 0; i < haystack.length; i++) {
    if (haystack[i] === needle) {
      count++;
    }
  }
  return count;
}

// Code beautifier called by context or keyboard shortcut
function fixIndentation(): void {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Please open a valid S+ file.");
    return;
  }

  // Set up variables for grabbing and replacing the text
  let doc = editor.document;
  var firstLine = doc.lineAt(0);
  var lastLine = doc.lineAt(doc.lineCount - 1);
  var textRange = new vscode.Range(0,
    firstLine.range.start.character,
    doc.lineCount - 1,
    lastLine.range.end.character);

  // The indent fixing code
  if (doc.languageId === "splus-source") {
    let outputText = "";
    let indentLevel = 0;                                        // Current line indent level (number of tabs)
    let inComment = 0;                                          // If we're in a comment and what level
    let startingComment = 0;                                    // Check if this line starts a comment
    let endingComment = 0;                                      // Check if this line ends a comment
    let docText = editor.document.getText();                    // Get the full text of the editor
    let docLines = docText.split(/\r?\n/);                      // Split into lines

    // Comment weeders
    let reDeCom1 = /(\/\/.*)/gm;                                // Single line comment
    let reDeCom2 = /((?:\(\*|\/\*).*(?:\*\)|\*\/))/gm;          // Fully enclosed multiline comment
    let reDeCom3 = /(.*(?:\*\)|\*\/))/gm;                       // Closing multiline comment
    let reDeCom4 = /((?:\(\*|\/\*).*)/gm;                       // Opening multiline comment
    let reString = /'[^']*'/gm;

    for (var line = 0; line < docLines.length; line++) {
      startingComment = 0;
      endingComment = 0;
      let thisLine = docLines[line];
      let thisLineTrimmed = docLines[line].trimLeft();
      let thisLineClean = docLines[line].trimLeft().replace(reDeCom1, "").replace(reDeCom2, "");      // Remove any single line comments and fully enclosed multiline comments

      if (reDeCom3.test(thisLineClean) && inComment > 0) {        // If a multiline comment closes on this line, decrease our comment level
        inComment = inComment - 1;
        if (inComment === 0) {
          endingComment = 1;
        }
      }
      if (reDeCom4.test(thisLineClean)) {                         // If a multiline comment opens on this line, increase our comment level
        if (inComment === 0) {
          startingComment = 1;                                    // If this line starts a multiline comment, it still needs to be checked
        }
        inComment = inComment + 1;
      }

      thisLineClean = thisLineClean.replace(reDeCom3, "").replace(reDeCom4, "");            // Remove any code that we think is inside multiline comments
      thisLineClean = thisLineClean.replace(reString, "");                                  // Remove any string literals from the line so we don't get false positives
      let brOpen = countChars(thisLineClean, '{') - countChars(thisLineClean, '}');         // Check the delta for squiggly brackets
      let sqOpen = countChars(thisLineClean, '[') - countChars(thisLineClean, ']');         // Check the delta for square brackets
      let parOpen = countChars(thisLineClean, '(') - countChars(thisLineClean, ')');        // Check the delta for parenthesis
      let indentDelta = brOpen + sqOpen + parOpen;                                          // Calculate total delta

      // Indent Increase Rules
      if ((inComment > 0 && !startingComment) || (!inComment && endingComment)) {           // If we're in a multiline comment, just leave the line alone unless it's the start of a ML comment
        outputText = outputText + thisLine + "\r";
      }
      else if (indentDelta > 0) {                                                         // If we're increasing indent delta because of this line, the add it, then increase indent
        outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + "\r";
        indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
      }
      // If we're decreasing delta, and the line starts with the character that is decreasing it, then decrease first, and then add this line
      else if (indentDelta < 0 && (thisLineClean[0] === '}' || thisLineClean[0] === ']' || thisLineClean[0] === ')')) {
        indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
        outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + "\r";
      }
      else if (indentDelta < 0) {                                                         // If we're decreasing delta but the first character isn't the cause, then we're still inside the block
        outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + "\r";
        indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
      }
      else {                                                                              // indentDelta === 0; do nothing except add the line with the indent
        outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + "\r";
      }
    };

    // Replace all the code in the editor with the new code
    editor.edit(editBuilder => {
      editBuilder.replace(textRange, outputText);
    });
  }
  else {
    vscode.window.showErrorMessage("Please open a valid S+ file.");
    return;
  }
}

interface SplusTaskDefinition extends vscode.TaskDefinition {
  buildPath: string;
}

function getCompileCommand(fileName: string, buildType: number): string {
  let compiler = new SplusCompiler();
  compiler.filepaths.push("\\rebuild \"" + fileName + "\"");
  if (buildType === 1) {
      compiler.filepaths.push("\\target series3");
  }
  else if (buildType === 2) {
      compiler.filepaths.push("\\target series3 series2");
  }
  else if (buildType === 3) {
      compiler.filepaths.push("\\target series2");
  }

  return compiler.buildCommand();
}

async function getCompileTasks(): Promise<vscode.Task[]> {
  let workspaceRoot = vscode.workspace.rootPath;
  let emptyTasks: vscode.Task[] = [];

  if (!workspaceRoot) {
    return emptyTasks;
  }

  try {
    let result: vscode.Task[] = [];
    let editor = vscode.window.activeTextEditor;
    let doc = editor.document;
    let executable = 'c:\\windows\\system32\\cmd.exe';

    // Create 3 series compile build task
    let buildCommand = getCompileCommand(doc.fileName, 1);

    let taskDef: SplusTaskDefinition = {
      type: 'shell',
      label: 'S+ Compile 3 Series',
      buildPath: buildCommand
    }

    let command: vscode.ShellExecution = new vscode.ShellExecution(`"${buildCommand}"`, { executable: executable, shellArgs: ['/c'] });
    let task = new vscode.Task(taskDef, 'S+ Compile 3 Series', 'crestron-splus', command, `$splusCC`);
    task.definition = taskDef;
    task.group = vscode.TaskGroup.Build;

    result.push(task);

    // Create 2 and 3 series build task
    buildCommand = getCompileCommand(doc.fileName, 2);

    taskDef = {
      type: 'shell',
      label: 'S+ Compile 2 and 3 Series',
      buildPath: buildCommand
    }

    command = new vscode.ShellExecution(`"${buildCommand}"`, { executable: executable, shellArgs: ['/c'] });
    task = new vscode.Task(taskDef, 'S+ Compile 2 and 3 Series', 'crestron-splus', command, `$splusCC`);
    task.definition = taskDef;
    task.group = vscode.TaskGroup.Build;

    result.push(task);

    // Create 2 series build task
    buildCommand = getCompileCommand(doc.fileName, 3);

    taskDef = {
      type: 'shell',
      label: 'S+ Compile 2 Series',
      buildPath: buildCommand
    }

    command = new vscode.ShellExecution(`"${buildCommand}"`, { executable: executable, shellArgs: ['/c'] });
    task = new vscode.Task(taskDef, 'S+ Compile 2 Series', 'crestron-splus', command, `$splusCC`);
    task.definition = taskDef;
    task.group = vscode.TaskGroup.Build;

    result.push(task);
    return result;
  }
  catch (err) {
    let channel = getOutputChannel();
    console.log(err);
    if (err.stderr) {
      channel.appendLine(err.stderr);
    }
    if (err.stdout) {
      channel.appendLine(err.stdout);
    }

    channel.appendLine('S+ compile failed');
    channel.show(true);
    return emptyTasks;
  }
}

let _channel: vscode.OutputChannel;
function getOutputChannel(): vscode.OutputChannel {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel("S+ Compile");
  }
  return _channel;
}

class SplusCompiler {
  constructor() {
    this.filepaths = [];
    this.compilerPath = "\"" + vscode.workspace.getConfiguration("splus").compilerLocation + "\"";
  }
  buildCommand() {
    let filepathConcat = "";
    this.filepaths.forEach(element => {
      filepathConcat += element + " ";
    });
    return this.compilerPath +
      " " +
      filepathConcat;
  }

  filepaths: string[];
  compilerPath: string;
}
// this method is called when your extension is deactivated
function deactivate(): void {
  if (taskProvider) {
    taskProvider.dispose();
  }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
