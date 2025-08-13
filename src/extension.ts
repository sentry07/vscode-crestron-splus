import {
    ExtensionContext,
    languages,
    workspace,
    window,
    commands,
    env,
    Uri,
    DocumentSelector,
    tasks
} from "vscode";

import { SimplPlusFormattingProvider } from './simplPlusFormattingProvider';
import { SimplPlusHoverProvider } from "./simplPlusHoverProvider";
import { SimplPlusTasks, } from './simplPlusTasks';
import { SimplPlusStatusBar } from "./simplPlusStatusBar";
import { insertCategory } from "./simplPlusCategories";
import { SimplPlusCompletionProvider } from "./simplPlusCompletionProvider";
import { SimplPlusDotCompletionProvider } from "./simplPlusDotCompletionProvider";
import { KeywordService } from "./services/keywordService";
import { SimplPlusSignatureHelpProvider } from "./simplPlusSignatureHelpProvider";
import { SimplPlusProjectObjectService } from "./services/simplPlusProjectObjectService";
import { SimplPlusQuoteCompletionProvider } from "./simplPlusQuoteCompletionProvider";

// Creates a terminal, calls the command, then closes the terminal
function callShellCommand(shellCommand: string): void {
    let term = window.createTerminal('crestron-splus', 'c:\\windows\\system32\\cmd.exe');
    term.sendText(`\"${shellCommand}\"`, true);
    term.sendText("exit", true);
}


export async function activate(context: ExtensionContext) {
    const selector: DocumentSelector = 'crestron-splus';

    const projectObjectService = SimplPlusProjectObjectService.getInstance(context);
    const keywordService = KeywordService.getInstance();

    const simplPlusStatusBar = SimplPlusStatusBar.getInstance(context);

    const simplPlusTasks = SimplPlusTasks.getInstance(context);
    let taskProvider = tasks.registerTaskProvider("crestron-splus", simplPlusTasks);

    let localHelp_command = commands.registerCommand("crestron-splus.localHelp", () => {
        const helpLocation = `${workspace.getConfiguration("crestron-splus").simplDirectory}\\Simpl+lr.chm`;
        callShellCommand(helpLocation);
    });

    let webHelp_command = commands.registerCommand("crestron-splus.webHelp", () => {
        env.openExternal(Uri.parse('https://help.crestron.com/simpl_plus'));
    });

    let showCategories_command = commands.registerCommand("crestron-splus.insertCategory", () => {
        insertCategory();
    });

    let build_command = commands.registerCommand("crestron-splus.build", () => {
        const activeEditor = window.activeTextEditor;
        if (activeEditor !== undefined) {
            const currentBuildTargets = simplPlusStatusBar.GetDocumentBuildTargets(activeEditor.document);
            simplPlusTasks.CompileCurrentSimplPlusFile(currentBuildTargets);
        }
    });

    let rebuild_command = commands.registerCommand("crestron-splus.rebuild", () => {
        const activeEditor = window.activeTextEditor;
        if (activeEditor !== undefined) {
            const currentBuildTargets = simplPlusStatusBar.GetDocumentBuildTargets(activeEditor.document);
            simplPlusTasks.CompileCurrentSimplPlusFile(currentBuildTargets, true);
        }
    });

    let openApis_command = commands.registerCommand("crestron-splus.openApis", async () => {
        const currentProjectUri = window.activeTextEditor.document.uri;
        await projectObjectService.openApis(currentProjectUri);
    });

    let openLibraries_command = commands.registerCommand("crestron-splus.openLibraries", async () => {
        const currentProjectUri = window.activeTextEditor.document.uri;
        await projectObjectService.openLibraries(currentProjectUri);
    });

    let thisFormatProvider = new SimplPlusFormattingProvider();
    const formatProvider = languages.registerDocumentFormattingEditProvider({ language: 'crestron-splus' }, thisFormatProvider);

    let thisHoverProvider = new SimplPlusHoverProvider();
    const hoverProvider = languages.registerHoverProvider({ language: 'crestron-splus' }, thisHoverProvider);

    let thisCompletionProvider = new SimplPlusCompletionProvider(keywordService, projectObjectService);
    const completionProvider = languages.registerCompletionItemProvider({ language: 'crestron-splus' }, thisCompletionProvider);

    let thisDotCompletionProvider = new SimplPlusDotCompletionProvider(keywordService, projectObjectService);
    const dotCompletionProvider = languages.registerCompletionItemProvider({ language: 'crestron-splus' }, thisDotCompletionProvider, '.');

    let thisQuoteCompletionProvider = new SimplPlusQuoteCompletionProvider();
    const quoteCompletionProvider = languages.registerCompletionItemProvider({ language: 'crestron-splus' }, thisQuoteCompletionProvider, '"');


    let thisSignatureHelpProvider = new SimplPlusSignatureHelpProvider(projectObjectService);
    const signatureHelpProvider = languages.registerSignatureHelpProvider({ language: 'crestron-splus' }, thisSignatureHelpProvider, '(', ',');

    window.onDidChangeActiveTextEditor((e) => {
        if (e === undefined) { return; }
        updateContextMenu(e.document.uri, projectObjectService);
    });
    projectObjectService.onLibrariesUpdated(() => {
        updateContextMenu(window.activeTextEditor?.document.uri, projectObjectService);
    });

    context.subscriptions.push(
        formatProvider,
        hoverProvider,
        openApis_command,
        openLibraries_command,
        localHelp_command,
        webHelp_command,
        build_command,
        rebuild_command,
        showCategories_command,
        completionProvider,
        dotCompletionProvider,
        quoteCompletionProvider,
        signatureHelpProvider,
        projectObjectService,
        taskProvider
        // textMateCompletionProvider
    );
}

function updateContextMenu(uri: Uri, project: SimplPlusProjectObjectService): void {
    commands.executeCommand("setContext", "crestron-splus:hasApis", project.hasApis(uri));
    commands.executeCommand("setContext", "crestron-splus:hasLibraries", project.hasLibraries(uri));
}




