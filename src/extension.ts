import {
    ExtensionContext,
    Disposable,
    languages,
    Range,
    TextDocument,
    TextEdit,
    workspace,
    tasks,
    window,
    Task,
    commands,
    TaskDefinition,
    Uri,
    ShellExecution,
    TaskGroup,
    OutputChannel,
    FormattingOptions,
    CancellationToken,
    DocumentRangeFormattingEditProvider,
    DocumentFormattingEditProvider,
    env,
    TaskScope,
    CustomExecution,
    TextDocumentSaveReason
} from "vscode";

import * as fs from 'fs';

let taskProvider: Disposable | undefined;

enum BuildType {
    None = 0,
    Series2 = 1,
    Series3 = 2,
    Series4 = 4,
    All = 7
}

export function activate(context: ExtensionContext) {

    if (workspace.workspaceFolders === undefined) {
        let fileName = window.activeTextEditor.document.uri.path;
        let fileFolder = fileName.slice(0, fileName.lastIndexOf("/") + 1);
        commands.executeCommand("vscode.openFolder", Uri.parse(fileFolder));
    }

    let localhelp_command = commands.registerCommand("splus.localHelp", () => {
        callShellCommand(workspace.getConfiguration("splus").helpLocation);
    });

    let webhelp_command = commands.registerCommand("splus.webHelp", openWebHelp);

    function rebuildTaskList(): void {
        if (taskProvider) {
            taskProvider.dispose();
            taskProvider = undefined;
        }
        if (!taskProvider && window.activeTextEditor.document.languageId === "splus-source") {
            let splusPromise: Thenable<Task[]> | undefined = undefined;
            taskProvider = tasks.registerTaskProvider('splus', {
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

    let thisFormatProvider = new formattingProvider(formatProvider);
    languages.registerDocumentFormattingEditProvider({ scheme: 'file', language: 'splus-source' }, thisFormatProvider);

    context.subscriptions.push(localhelp_command);
    context.subscriptions.push(webhelp_command);

    workspace.onDidChangeConfiguration(rebuildTaskList);
    workspace.onDidOpenTextDocument(rebuildTaskList);
    workspace.onDidSaveTextDocument(rebuildTaskList);
    window.onDidChangeActiveTextEditor(rebuildTaskList);

    rebuildTaskList();
}

function openWebHelp(): void {
    commands.executeCommand('simpleBrowser.show', 'http://help.crestron.com/simpl_plus');
}

export interface RangeFormattingOptions {
    rangeStart: number;
    rangeEnd: number;
}

export class formattingProvider
    implements
    DocumentRangeFormattingEditProvider,
    DocumentFormattingEditProvider {
    constructor(
        private provideEdits: (
            document: TextDocument,
            options?: RangeFormattingOptions
        ) => Promise<TextEdit[]>
    ) { }


    public async provideDocumentRangeFormattingEdits(
        document: TextDocument,
        range: Range,
        _options: FormattingOptions,
        _token: CancellationToken
    ): Promise<TextEdit[]> {
        return this.provideEdits(document, {
            rangeEnd: document.offsetAt(range.end),
            rangeStart: document.offsetAt(range.start),
        });
    }

    public async provideDocumentFormattingEdits(
        document: TextDocument,
        _options: FormattingOptions,
        _token: CancellationToken
    ): Promise<TextEdit[]> {
        return this.provideEdits(document);
    }
}

function fullDocumentRange(document: TextDocument): Range {
    const lastLineId = document.lineCount - 1;
    return new Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
}

async function formatProvider(document: TextDocument, _options?: RangeFormattingOptions): Promise<TextEdit[]> {
    let outputText = formatText(document.getText());
    return [new TextEdit(
        fullDocumentRange(document),
        outputText)];
}

function formatText(docText: string): string {
    // Set up variables for grabbing and replacing the text
    let outputText = "";
    let indentLevel = 0;                                        // Current line indent level (number of tabs)
    let inComment = 0;                                          // If we're in a comment and what level
    let inSignalList = 0;                                       // If we're in a list of signals
    let startingComment = 0;                                    // Check if this line starts a comment
    let endingComment = 0;                                      // Check if this line ends a comment
    let startingSignalList = 0;
    let docLines = docText.split(/\r?\n/);                      // Split into lines

    let lineSuffix = '\r';                                      // whether to add the suffix or not

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
                startingComment = 1;                                // If this line starts a multiline comment, it still needs to be checked
            }
            inComment = inComment + 1;
        }

        thisLineClean = thisLineClean.replace(reDeCom3, "").replace(reDeCom4, "");            // Remove any code that we think is inside multiline comments
        thisLineClean = thisLineClean.replace(reString, "");                                  // Remove any string literals from the line so we don't get false positives
        let brOpen = countChars(thisLineClean, '{') - countChars(thisLineClean, '}');         // Check the delta for squiggly brackets
        let sqOpen = countChars(thisLineClean, '[') - countChars(thisLineClean, ']');         // Check the delta for square brackets
        let parOpen = countChars(thisLineClean, '(') - countChars(thisLineClean, ')');        // Check the delta for parenthesis
        let indentDelta = brOpen + sqOpen + parOpen;                                          // Calculate total delta

        if ((
            thisLineClean.toLowerCase().includes("digital_input") ||
            thisLineClean.toLowerCase().includes("analog_input") ||
            thisLineClean.toLowerCase().includes("string_input") ||
            thisLineClean.toLowerCase().includes("buffer_input") ||
            thisLineClean.toLowerCase().includes("digital_output") ||
            thisLineClean.toLowerCase().includes("analog_output") ||
            thisLineClean.toLowerCase().includes("string_output")
        ) && !thisLineClean.includes(";")) {
            inSignalList = 1;
            startingSignalList = 1;
        }

        
        if (line == docLines.length - 1)
        {
            lineSuffix = '';
        }

        // Indent Increase Rules
        if (inSignalList == 1) {
            if (startingSignalList == 1) {
                outputText = outputText + thisLineTrimmed + lineSuffix;
                startingSignalList = 0;
            }
            else {
                outputText = outputText + ('\t'.repeat(4)) + thisLineTrimmed + lineSuffix;
                if (thisLineTrimmed.includes(";")) {
                    inSignalList = 0;
                }
            }
        }
        // If we're in a multiline comment, just leave the line alone unless it's the start of a ML comment
        else if ((inComment > 0 && !startingComment) || (!inComment && endingComment)) {
            outputText = outputText + thisLine + lineSuffix;
        }
        // If we're increasing indent delta because of this line, the add it, then increase indent
        else if (indentDelta > 0) {
            outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + lineSuffix;
            indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
        }
        // If we're decreasing delta, and the line starts with the character that is decreasing it, then decrease first, and then add this line
        else if (indentDelta < 0 && (thisLineClean[0] === '}' || thisLineClean[0] === ']' || thisLineClean[0] === ')')) {
            indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
            outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + lineSuffix;
        }
        // If we're decreasing delta but the first character isn't the cause, then we're still inside the block
        else if (indentDelta < 0) {
            outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + lineSuffix;
            indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
        }
        // indentDelta === 0; do nothing except add the line with the indent
        else {
            outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + lineSuffix;
        }
    };

    return outputText;
}

// Creates a terminal, calls the command, then closes the terminal
function callShellCommand(shellCommand: string): void {
    let term = window.createTerminal('splus', 'c:\\windows\\system32\\cmd.exe');
    term.sendText("\"" + shellCommand + "\"", true);
    term.sendText("exit", true);
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

class SplusCompiler {
    constructor() {
        this.arguments = [];
        this.compilerPath = "\"\"" + workspace.getConfiguration("splus").compilerLocation + "\"";
    }
    buildCommand() {
        return this.compilerPath + " " + this.arguments.join(" ");
    }

    arguments: string[];
    compilerPath: string;
}

function getBuildParameters(fileName: string, buildType: BuildType): [string, string] {
    let compiler = new SplusCompiler();
    compiler.arguments.push("\\rebuild \"" + fileName + "\" \\target");

    let seriesTargets = [];
    if ((buildType & BuildType.Series2) === BuildType.Series2) {
        seriesTargets.push(2);
        compiler.arguments.push("series2");
    }
    if ((buildType & BuildType.Series3) === BuildType.Series3) {
        seriesTargets.push(3);
        compiler.arguments.push("series3");
    }
    if ((buildType & BuildType.Series4) === BuildType.Series4) {
        seriesTargets.push(4);
        compiler.arguments.push("series4");
    }
    compiler.arguments.push("\"");
    let label = "Compile " + seriesTargets.join(" & ") + " Series";
    let command = compiler.buildCommand();
    return [label, command];
}

function getApiCommand(apiFileName: string, thisFileDir: string): string {
    let workDir = thisFileDir + "SPlsWork\\";
    return "\"" + workDir + "splusheader.exe\" \"" + workDir + apiFileName + ".dll\" \"" + thisFileDir + apiFileName + ".api\"";
}

function getApiInIncludeCommand(apiFileName: string, thisFileDir: string, includePaths: string[]): string {
    includePaths.forEach((path: string) => {
        let thisPath = path.slice(14, -1);
        let workDir = thisFileDir;
        if (workDir.endsWith("\\")) {
            workDir = workDir.slice(0, -1);
        }
        while (thisPath.startsWith("..\\\\")) {
            thisPath = thisPath.slice(3);
            workDir = workDir.slice(0, workDir.lastIndexOf("\\"));
        }
        if (!thisPath.endsWith("\\")) {
            thisPath = thisPath + "\\";
        }
        if (fs.existsSync(workDir + "\\" + thisPath + apiFileName + ".dll")) {
            return "\"" + workDir + "splusheader.exe\" \"" + workDir + apiFileName + ".dll\" \"" + thisFileDir + apiFileName + ".api\"";
        }
    })

    return "";
}

function getBuildTask(doc: TextDocument, buildType: BuildType): Task {
    let [label, buildCommand] = getBuildParameters(doc.fileName, buildType);

    let taskDef: TaskDefinition = {
        type: "shell",
        label: label,
        command: buildCommand,
        problemMatcher: ["$splusCC"],
        presentation: {
            panel: "shared",
            focus: true,
            clear: true
        }
    }

    let executable = 'C:\\Windows\\System32\\cmd.exe';
    let command = new ShellExecution("\"" + taskDef.command + "\"", { executable: executable, shellArgs: ['/c'] });
    let task = new Task(taskDef, TaskScope.Workspace, taskDef.label, "Crestron S+", command, taskDef.problemMatcher);
    task.group = TaskGroup.Build;
    task.definition = taskDef;
    task.presentationOptions = taskDef.presentation;

    return task;
}

async function getCompileTasks(): Promise<Task[]> {
    let result: Task[] = [];
    let editor = window.activeTextEditor;
    let doc = editor.document;
    let emptyTasks: Task[] = [];

    let workspaceFolder = workspace.getWorkspaceFolder(doc.uri)
    if (!workspaceFolder) {
        return emptyTasks;
    }

    let workspaceRoot = workspaceFolder.uri.fsPath;
    if (!workspaceRoot) {
        return emptyTasks;
    }

    try {
        let sSharpLibRegEx = /(#(?:USER|CRESTRON)_SIMPLSHARP_LIBRARY)\s*\"([\w\.\-]*)\"/gmi;
        let sSharpIncludeRegEx = /#INCLUDEPATH\s*\"([\w\.\-]*)\"/gmi;

        let sSharpLibs = doc.getText().match(sSharpLibRegEx);
        let sSharpIncludes = doc.getText().match(sSharpIncludeRegEx);

        let enable2SeriesCompile = workspace.getConfiguration("splus").enable2series === true;
        let enable3SeriesCompile = workspace.getConfiguration("splus").enable3series === true;
        let enable4SeriesCompile = workspace.getConfiguration("splus").enable4series === true;

        if (sSharpLibs && sSharpLibs.length > 0) {
            sSharpLibs.forEach((regexMatch: string) => {
                let fileName = "";
                let tokens = regexMatch.match(/\S+/g)
                if (tokens.length > 1)
                    fileName = tokens[1].slice(1, -1);

                let thisFileDir = doc.fileName.slice(0, doc.fileName.lastIndexOf("\\") + 1);

                if (fs.existsSync(thisFileDir + "SPlsWork\\" + fileName + ".dll")) {
                    let buildCommand = getApiCommand(fileName, thisFileDir);

                    let taskDef: TaskDefinition = {
                        type: "shell",
                        label: "Generate API file for " + fileName,
                        command: buildCommand,
                        problemMatcher: [],
                        presentation: {
                            panel: "shared",
                            focus: true,
                            clear: true
                        }
                    }

                    let executable = 'C:\\Windows\\System32\\cmd.exe';
                    let command = new ShellExecution("\"" + taskDef.command + "\"", { executable: executable, shellArgs: ['/c'] });
                    let task = new Task(taskDef, TaskScope.Workspace, taskDef.label, 'Crestron S+', command, taskDef.problemMatcher);
                    task.group = TaskGroup.Build;
                    task.definition = taskDef;
                    task.presentationOptions = taskDef.presentation;

                    result.push(task);
                }
            })
        }

        if (enable2SeriesCompile) {
            result.push(getBuildTask(doc, BuildType.Series2)); // compile 2 series
            if (enable3SeriesCompile) {
                result.push(getBuildTask(doc, BuildType.Series2 | BuildType.Series3)); // compile 2 & 3 series
            }
        }

        if (enable3SeriesCompile) {
            result.push(getBuildTask(doc, BuildType.Series3)); // compile 3 series
            if (enable4SeriesCompile) {
                result.push(getBuildTask(doc, BuildType.Series3 | BuildType.Series4)); // compile 3 & 4 series
            }
        }

        if (enable4SeriesCompile) {
            result.push(getBuildTask(doc, BuildType.Series4)); // compile 4 series
        }

        // likely do not need 2 & 4 series compile option...
        if (enable2SeriesCompile && enable3SeriesCompile && enable4SeriesCompile) {
            result.push(getBuildTask(doc, BuildType.All));
        }

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

        channel.appendLine('SIMPL+ compile failed');
        channel.show(true);
        return emptyTasks;
    }
}

let _channel: OutputChannel;
function getOutputChannel(): OutputChannel {
    if (!_channel) {
        _channel = window.createOutputChannel("SIMPL+ Compile");
    }
    return _channel;
}

// this method is called when your extension is deactivated
export function deactivate(): void {
    if (taskProvider) {
        taskProvider.dispose();
    }
}
