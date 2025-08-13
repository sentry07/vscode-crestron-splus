import * as fs from 'fs';
import * as path from 'path';
import { extensions, Position, QuickPickItem, QuickPickOptions, window } from 'vscode';
export async function insertCategory() {
    const extensionPath = extensions.getExtension("sentry07.simpl-plus")?.extensionPath;
    if (extensionPath === undefined) { return; }
    const categoriesPath = path.join(extensionPath, "support", "categories.json");
    if (!fs.existsSync(categoriesPath)) {
        window.showErrorMessage("Categories file not found. Reinstall Extension");
        return;
    }
    const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8')) as QuickPickItem[];
    const quickPickOptions: QuickPickOptions = {
        canPickMany: false,
        placeHolder: "Select category to insert",
        matchOnDescription: true,
    };
    const selection = await window.showQuickPick<any>(categories, quickPickOptions) as QuickPickItem;
    if (selection) {
        const activeTextDocument = window.activeTextEditor?.document;
        if (activeTextDocument === undefined) { return; }
        const activeEditorContents = activeTextDocument.getText();
        const regex = /#category/i;
        const match = activeEditorContents.match(regex);
        let insertionPoint = new Position(0, 0);
        let insertionText = `\"${selection.label}\"`;
        if (match !== null) {
            insertionPoint = activeTextDocument.positionAt(match.index!);
        }
        if (selection.label === "46") {
            const customCategory = await window.showInputBox({ prompt: "Enter custom category name" });
            if (customCategory === undefined) {
                return;
            }
            insertionText = `${insertionText} \"${customCategory}\"`;
        }
        await window.activeTextEditor?.edit((editBuilder) => {
            editBuilder.insert(insertionPoint, `#Category ${insertionText} \/\/${selection.description}\n`);
        });
    }

}