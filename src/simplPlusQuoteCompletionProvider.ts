import {
    CancellationToken,
    CompletionContext,
    CompletionItem,
    CompletionItemProvider,
    Position,
    ProviderResult,
    TextDocument,
    CompletionItemKind,
} from "vscode";
import * as fs from "fs";

export class SimplPlusQuoteCompletionProvider implements CompletionItemProvider {


    constructor() {
    }

    public provideCompletionItems(document: TextDocument,
        position: Position,
        token: CancellationToken,
        context: CompletionContext):
        ProviderResult<CompletionItem[]> {
            const textUntilPosition = document.getText().slice(0, document.offsetAt(position));
            const lastQuoteIndex = textUntilPosition.lastIndexOf("\"");
            if (lastQuoteIndex === -1) {
                return [];
            }
            if (textUntilPosition.match(/\#USER_LIBRARY\s"$/i)) {
                return this.getCompletionFilesByExtension(".usl", document);
            }
            if (textUntilPosition.match(/\#USER_SIMPLSHARP_LIBRARY\s"$/i)) {
                return this.getCompletionFilesByExtension(".clz", document);
            }

    }

    private getCompletionFilesByExtension(extension: string, document: TextDocument): CompletionItem[] {
        let CompletionItems: CompletionItem[] = [];
        const currentDirectory = document.uri.fsPath.slice(0, document.uri.fsPath.lastIndexOf("\\"));
        const files = fs.readdirSync(currentDirectory);
        const uslLibraries = files.filter(file => file.endsWith(extension));
        uslLibraries.forEach(uslLibrary => {
            const fileName = uslLibrary.split(".")[0];
            const completionItem = new CompletionItem(uslLibrary, CompletionItemKind.File);
            completionItem.insertText = fileName;
            CompletionItems.push(completionItem);
        });
        return CompletionItems;
    }
}