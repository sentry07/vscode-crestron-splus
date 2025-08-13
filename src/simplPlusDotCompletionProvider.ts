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
import { KeywordService } from "./services/keywordService";
import { SimplPlusProjectObjectService } from "./services/simplPlusProjectObjectService";

export class SimplPlusDotCompletionProvider implements CompletionItemProvider {
    private _keywordService: KeywordService;
    private _projectObjectService: SimplPlusProjectObjectService;

    constructor(keywordService: KeywordService, tokenService: SimplPlusProjectObjectService) {
        this._keywordService = keywordService;
        this._projectObjectService = tokenService;
    }

    public provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
        context: CompletionContext):
        ProviderResult<CompletionItem[]> {
        const uri = document.uri;
        let completionItems: CompletionItem[] = [];
        const currentObject = this._projectObjectService.getObjectAtPosition(document, position);
        if (currentObject === undefined) { return completionItems; }
        switch (currentObject.kind) {
            case CompletionItemKind.Struct:
            case CompletionItemKind.Class:
            case CompletionItemKind.Enum:
                return this._projectObjectService.getCompletionItemsFromObjects(currentObject.children);
            case CompletionItemKind.Variable:
                const builtInMembers = this._keywordService.getCompletionItemsFromBuiltInTypes(currentObject.dataType);
                return (builtInMembers.length > 0) ? builtInMembers : [];
            default:
                return [];
        }
    }
}