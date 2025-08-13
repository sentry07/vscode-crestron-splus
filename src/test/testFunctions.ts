import * as vscode from 'vscode';
import * as fs from 'fs';

export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function removeWorkspaceCustomSettings() {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    const simplConfig = vscode.workspace.getConfiguration("simpl-plus");
    await simplConfig.update("enable2series",undefined, vscode.ConfigurationTarget.Workspace);
    await simplConfig.update("enable3series",undefined, vscode.ConfigurationTarget.Workspace);
    await simplConfig.update("enable4series",undefined, vscode.ConfigurationTarget.Workspace);
    await simplConfig.update("simplDirectory",undefined, vscode.ConfigurationTarget.Workspace);
}

export async function OpenAndShowSPlusDocument(documentContent: string) {
    const document = await vscode.workspace.openTextDocument({
        language: "simpl-plus",
        content: documentContent,
    });
    var test = await vscode.window.showTextDocument(document);
    await delay(100);
}