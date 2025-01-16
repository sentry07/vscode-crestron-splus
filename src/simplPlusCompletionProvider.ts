import {
    CancellationToken,
    CompletionContext,
    CompletionItem,
    CompletionItemProvider,
    Position,
    ProviderResult,
    TextDocument,
    CompletionItemKind,
    SnippetString,
    Uri,
    window,
    CompletionItemLabel,
} from "vscode";
import { SimplPlusKeywordHelpService } from "./services/simplPlusKeywordHelpService";
import { KeywordService } from "./services/keywordService";
import { SimplPlusProjectObjectService } from "./services/simplPlusProjectObjectService";
import { SimplPlusObject } from "./base/simplPlusObject";

export class SimplPlusCompletionProvider implements CompletionItemProvider {
    private _keywordService: KeywordService;
    private _projectObjectService: SimplPlusProjectObjectService;

    constructor(keywordService: KeywordService, projectObjectService: SimplPlusProjectObjectService) {
        this._keywordService = keywordService;
        this._projectObjectService = projectObjectService;
    }

    public provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
        context: CompletionContext):
        ProviderResult<CompletionItem[]> {
        const uri = document.uri;
        const currentBlock = this._projectObjectService.getProgramObjectAtPosition(uri, position);
        if (currentBlock === undefined) {
            const lineUntilPosition = document.lineAt(position.line).text.slice(0, position.character);
            if (lineUntilPosition.toLowerCase().match(/(push|release|change|event)/)) {
                const inputVariables = this.getInternalInputVariables(uri);
                return inputVariables;
            }
            if (lineUntilPosition.toLowerCase().match(/(socketconnect|socketdisconnect|socketstatus|socketreceive)/)) {
                const socketVariables = this.getInternalSocketVariables(uri);
                return socketVariables;
            }
            const completionItems = this.getRootKeywords();
            const rootVariables = this.getProjectRootObjects(uri);
            return completionItems.concat(rootVariables);
        }
        switch (currentBlock.kind) {
            case CompletionItemKind.Event:
            case CompletionItemKind.Function:
                if (this._projectObjectService.isPositionAtFunctionParameter(currentBlock, position)) {
                    const parameterKeywords = this.getParameterKeywords();
                    return parameterKeywords;
                }
                let functionKeywords = this.getFunctionKeywords();
                let functionObjects = this.getProjectFunctionObjects(uri);
                const functionVariables = this.getFunctionVariables(currentBlock);
                const lineUntilPosition = document.lineAt(position.line).text.slice(0, position.character);
                if (lineUntilPosition.match(/[\=\(\[]/)) {
                    functionKeywords = this.getExpressionKeywords();
                    functionObjects = this.getProjectExpressionObjects(uri);
                }
                return functionVariables.concat(functionKeywords).concat(functionObjects);
            case CompletionItemKind.Struct:
                const structureKeywords = this.getStructureKeywords();
                //structures can have other nested structures or classes as structure members;
                const structureVariables = this.getInternalStructureVariables(uri);
                return structureVariables.concat(structureKeywords);
            default:
                return this.getRootKeywords();
        }
    }
    public resolveCompletionItem(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
        return new Promise(async resolve => {
            const uri = window.activeTextEditor?.document.uri;
            const itemLabel = typeof item.label === "string" ? item.label : item.label.label;
            let functionInfo = this._projectObjectService.getFunctionInfo(uri, itemLabel);
            console.log("keyword?", functionInfo);
            if (functionInfo === undefined) {
                //if item is from a keyword, add help from the Online help service
                const keyword = this._keywordService.getKeyword(itemLabel);
                if (keyword === undefined || !keyword.hasHelp) { resolve(item); return; }
                const helpDefinitions = await SimplPlusKeywordHelpService.getInstance();
                const helpContent = await helpDefinitions.GetSimplHelp(itemLabel);
                if (helpContent !== undefined) {
                    item.documentation = helpContent;
                    if (keyword.kind === CompletionItemKind.Function) {
                        functionInfo = helpDefinitions.GetFunctionInfoFromHelp(itemLabel, helpContent);
                        const functionItem = this._projectObjectService.getCompletionItemsFromObjects([functionInfo])[0];
                        item.label = functionItem.label;
                        item.documentation = functionItem.documentation;
                        item.insertText = functionItem.insertText;
                        item.command = functionItem.command;
                        item.kind = functionItem.kind;
                    }
                }
            }
            if (functionInfo !== undefined) {
                let functionDocs = `${functionInfo.dataType} ${functionInfo.name}(`;
                const functionParams = functionInfo.children.filter(ch => ch.kind === CompletionItemKind.TypeParameter);
                if (functionParams.length > 0) {
                    functionDocs += functionParams.map(p => `${p.dataType} ${p.name}`).join(", ");
                }
                functionDocs += ")";
                const functionLabel: CompletionItemLabel = {
                    label: itemLabel,
                    description: functionDocs,
                };
                item.label = functionLabel;
            }
            console.log("i", item);
            resolve(item);
        });
    }
    private getInternalInputVariables(uri: Uri): CompletionItem[] {
        const documentItems = this._projectObjectService.getProjectObjects(uri);
        if (documentItems === undefined) {
            return [];
        }
        const thisDocument = documentItems.filter(di => di.uri === uri.toString() && di.kind === CompletionItemKind.Variable);
        const items = thisDocument.filter(di => di.dataType.toLowerCase().match(/input/));
        return this._projectObjectService.getCompletionItemsFromObjects(items);
    }
    private getInternalSocketVariables(uri: Uri): CompletionItem[] {
        const documentItems = this._projectObjectService.getProjectObjects(uri);
        if (documentItems === undefined) {
            return [];
        }
        const thisDocument = documentItems.filter(di => di.uri === uri.toString() && di.kind === CompletionItemKind.Variable);
        const items = thisDocument.filter(di => di.dataType.toLowerCase().match(/(tcp_client|tcp_server|udp_socket)/));
        return this._projectObjectService.getCompletionItemsFromObjects(items);
    }
    private getInternalStructureVariables(uri: Uri): CompletionItem[] {
        const documentItems = this._projectObjectService.getProjectObjects(uri);
        if (documentItems === undefined) {
            return [];
        }
        //provide only with user structure and class objects
        const programStructures = documentItems.filter(di => (di.kind === CompletionItemKind.Struct || di.kind === CompletionItemKind.Class));
        return this._projectObjectService.getCompletionItemsFromObjects(programStructures);
    }
    private getExpressionKeywords(): CompletionItem[] {
        const functionKeywords: string[] = [
            "Statement",
        ];
        const keywordDefinitions = this._keywordService.getKeywordsByType(functionKeywords);
        const functionKinds: CompletionItemKind[] = [
            CompletionItemKind.Function,
            CompletionItemKind.Variable,
            CompletionItemKind.Constant,
        ];
        let functionDefinitions = this._keywordService.getKeywordsByKind(functionKinds);
        functionDefinitions = functionDefinitions.filter(f => f.type !== "void");
        return this._keywordService.getCompletionItemsFromKeywords(keywordDefinitions.concat(functionDefinitions));
    }
    private getParameterKeywords(): CompletionItem[] {
        const functionKeyword: string[] = [
            "Modifier",
            "Variable Declaration",
        ];
        const keywordDefinitions = this._keywordService.getKeywordsByType(functionKeyword);
        return this._keywordService.getCompletionItemsFromKeywords(keywordDefinitions);
    }
    private getFunctionKeywords(): CompletionItem[] {
        const functionKeywords: string[] = [
            "Modifier",
            "Variable Declaration",
            "Global Declaration",
            "Statement",
        ];
        const keywordDefinitions = this._keywordService.getKeywordsByType(functionKeywords);
        const functionKinds: CompletionItemKind[] = [
            CompletionItemKind.Function,
            CompletionItemKind.Event,
            CompletionItemKind.Struct,
            CompletionItemKind.Class,
            CompletionItemKind.Variable,
        ];
        let functionDefinitions = this._keywordService.getKeywordsByKind(functionKinds);
        functionDefinitions = functionDefinitions.filter(f => f.type === "void");
        return this._keywordService.getCompletionItemsFromKeywords(keywordDefinitions.concat(functionDefinitions));
    }
    private getStructureKeywords(): CompletionItem[] {
        const structureKeyword: string[] = [
            "Modifier",
            "Variable Declaration",
        ];

        const keywordDefinitions = this._keywordService.getKeywordsByType(structureKeyword);
        return this._keywordService.getCompletionItemsFromKeywords(keywordDefinitions);
    }

    //provides function variables and parameters
    private getFunctionVariables(functionToken: SimplPlusObject): CompletionItem[] {
        return this._projectObjectService.getCompletionItemsFromObjects(functionToken.children);
    }
    private getRootKeywords(): CompletionItem[] {
        const rootKeywords: string[] = [
            "Class",
            "Declaration",
            "Global Declaration",
            "Input Declaration",
            "Output Declaration",
            "Parameter Declaration",
            "Function Declaration",
            "Variable Declaration",
            "Modifier",
            "Structure",
        ];
        const keywordDefinitions = this._keywordService.getKeywordsByType(rootKeywords);
        return this._keywordService.getCompletionItemsFromKeywords(keywordDefinitions);
    }
    private getProjectRootObjects(uri: Uri): CompletionItem[] {
        const functionKinds: CompletionItemKind[] = [
            CompletionItemKind.Struct,
            CompletionItemKind.Class,
        ];

        const documentItems = this._projectObjectService.getProjectObjectByKind(uri, functionKinds);
        if (documentItems === undefined) {
            return [];
        }
        const items = this._projectObjectService.getCompletionItemsFromObjects(documentItems);
        return items;
    }

    private getProjectFunctionObjects(uri: Uri): CompletionItem[] {
        let documentItems = this._projectObjectService.getProjectObjects(uri);
        if (documentItems === undefined) {
            return [];
        }
        documentItems = documentItems.filter(di => {
            if (di.kind === CompletionItemKind.Constant) { return false; }
            if (di.kind !== CompletionItemKind.Function) {
                return true;
            }
            return di.dataType.toLowerCase() === "void";
        });
        const items = this._projectObjectService.getCompletionItemsFromObjects(documentItems);
        return items;
    }

    private getProjectExpressionObjects(uri: Uri): CompletionItem[] {
        let documentItems = this._projectObjectService.getProjectObjects(uri);
        if (documentItems === undefined) {
            return [];
        }
        documentItems = documentItems.filter(di => {
            if (di.kind !== CompletionItemKind.Function) {
                return true;
            }
            return di.dataType.toLowerCase() !== "void";
        });
        const items = this._projectObjectService.getCompletionItemsFromObjects(documentItems);
        return items;
    }

}