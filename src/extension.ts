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
    let term = window.createTerminal('simpl-plus', 'c:\\windows\\system32\\cmd.exe');
    term.sendText(`\"${shellCommand}\"`, true);
    term.sendText("exit", true);
}


export async function activate(context: ExtensionContext) {
    const selector: DocumentSelector = 'simpl-plus';

    const projectObjectService = SimplPlusProjectObjectService.getInstance(context);
    const keywordService = KeywordService.getInstance();

    const simplPlusStatusBar = SimplPlusStatusBar.getInstance(context);

    const simplPlusTasks = SimplPlusTasks.getInstance(context);
    let taskProvider = tasks.registerTaskProvider("simpl-plus", simplPlusTasks);

    let localHelp_command = commands.registerCommand("simpl-plus.localHelp", () => {
        const helpLocation = `${workspace.getConfiguration("simpl-plus").simplDirectory}\\Simpl+lr.chm`;
        callShellCommand(helpLocation);
    });

    let webHelp_command = commands.registerCommand("simpl-plus.webHelp", () => {
        env.openExternal(Uri.parse('https://help.crestron.com/simpl_plus'));
    });

    let showCategories_command = commands.registerCommand("simpl-plus.insertCategory", () => {
        insertCategory();
    });

    let build_command = commands.registerCommand("simpl-plus.build", () => {
        const activeEditor = window.activeTextEditor;
        if (activeEditor !== undefined) {
            const currentBuildTargets = simplPlusStatusBar.GetDocumentBuildTargets(activeEditor.document);
            simplPlusTasks.CompileCurrentSimplPlusFile(currentBuildTargets);
        }
    });

    let rebuild_command = commands.registerCommand("simpl-plus.rebuild", () => {
        const activeEditor = window.activeTextEditor;
        if (activeEditor !== undefined) {
            const currentBuildTargets = simplPlusStatusBar.GetDocumentBuildTargets(activeEditor.document);
            simplPlusTasks.CompileCurrentSimplPlusFile(currentBuildTargets, true);
        }
    });

    let openApis_command = commands.registerCommand("simpl-plus.openApis", async () => {
        const currentProjectUri = window.activeTextEditor.document.uri;
        await projectObjectService.openApis(currentProjectUri);
    });

    let openLibraries_command = commands.registerCommand("simpl-plus.openLibraries", async () => {
        const currentProjectUri = window.activeTextEditor.document.uri;
        await projectObjectService.openLibraries(currentProjectUri);
    });

    let thisFormatProvider = new SimplPlusFormattingProvider();
    const formatProvider = languages.registerDocumentFormattingEditProvider({ language: 'simpl-plus' }, thisFormatProvider);

    let thisHoverProvider = new SimplPlusHoverProvider();
    const hoverProvider = languages.registerHoverProvider({ language: 'simpl-plus' }, thisHoverProvider);

    let thisCompletionProvider = new SimplPlusCompletionProvider(keywordService, projectObjectService);
    const completionProvider = languages.registerCompletionItemProvider({ language: 'simpl-plus' }, thisCompletionProvider);

    let thisDotCompletionProvider = new SimplPlusDotCompletionProvider(keywordService, projectObjectService);
    const dotCompletionProvider = languages.registerCompletionItemProvider({ language: 'simpl-plus' }, thisDotCompletionProvider, '.');

    let thisQuoteCompletionProvider = new SimplPlusQuoteCompletionProvider();
    const quoteCompletionProvider = languages.registerCompletionItemProvider({ language: 'simpl-plus' }, thisQuoteCompletionProvider, '"');


    let thisSignatureHelpProvider = new SimplPlusSignatureHelpProvider(projectObjectService);
    const signatureHelpProvider = languages.registerSignatureHelpProvider({ language: 'simpl-plus' }, thisSignatureHelpProvider, '(', ',');

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
    commands.executeCommand("setContext", "simpl-plus:hasApis", project.hasApis(uri));
    commands.executeCommand("setContext", "simpl-plus:hasLibraries", project.hasLibraries(uri));
}




