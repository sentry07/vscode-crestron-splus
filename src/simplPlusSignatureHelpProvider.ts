import {
    CancellationToken,
    Position,
    ProviderResult,
    TextDocument,
    SignatureHelpProvider,
    SignatureHelp,
    SignatureHelpContext,
    SignatureInformation,
    ParameterInformation,
    Range,
    CompletionItemLabel,
    CompletionItemKind,
} from "vscode";
import { SimplPlusProjectObjectService } from "./services/simplPlusProjectObjectService";
import { SimplPlusObject } from "./base/simplPlusObject";
import { KeywordService } from "./services/keywordService";
import { SimplPlusKeywordHelpService } from "./services/simplPlusKeywordHelpService";

export class SimplPlusSignatureHelpProvider implements SignatureHelpProvider {
    private _tokenService: SimplPlusProjectObjectService;
    constructor(tokenService: SimplPlusProjectObjectService) {
        this._tokenService = tokenService;
    }
    provideSignatureHelp(
        document: TextDocument,
        position: Position,
        cancellationToken: CancellationToken,
        context: SignatureHelpContext
    ): ProviderResult<SignatureHelp> {
        return new Promise(async resolve => {
            const currentCharacter =position.character;
            let functionToken: SimplPlusObject | undefined = undefined;
            const textAtPosition = document.lineAt(position.line).text.slice(0, currentCharacter);
            const match = textAtPosition.match(/([\w][\#\$\w]*)\s*\(([^\)]*)(?!\))$/);  // Match a keyword followed by an open parenthesis as long as there is no closing parenthesis
            if (match === null) {
                return resolve(undefined);
            }
            const functionName = match[1];
            const lastCompletionItem = this._tokenService.getFunctionAtPosition(document,position);
            console.log("lc",lastCompletionItem);
            if (lastCompletionItem && lastCompletionItem.name === functionName) {
                functionToken = lastCompletionItem;
            }
            if (!functionToken) {
                const keywordService = KeywordService.getInstance();
                const keyword = keywordService.getKeyword(functionName);
                console.log("Helper Keyword:",keyword);
                if (keyword === undefined || !keyword.hasHelp || keyword.kind !== CompletionItemKind.Function) {
                    return undefined;
                }
                const helpService = await SimplPlusKeywordHelpService.getInstance();
                const functionHelp = await helpService.GetSimplHelp(functionName);
                functionToken = helpService.GetFunctionInfoFromHelp(functionName, functionHelp);
            }
            console.log("Helper token:",functionToken); 
            const signatureHelp = new SignatureHelp();
            let functionText = `${functionToken.dataType} ${functionToken.name}(`;
            const parameters: ParameterInformation[] = [];
            const functionParams = functionToken.children.filter(ch=>ch.kind===CompletionItemKind.TypeParameter);
            if (functionParams.length > 0) {
                functionText += functionParams.map(p => {
                    parameters.push(new ParameterInformation(p.name));
                    return `${p.dataType} ${p.name}`;
                }).join(", ");
            };
            functionText += ")";
            const signatureInformation = new SignatureInformation(functionText);
            signatureInformation.parameters = parameters;
            signatureHelp.signatures = [signatureInformation];
            signatureHelp.activeSignature = 0;
            const parameterText = textAtPosition.match(/\(([^)]*)/); // Match the text between the open and close parenthesis
            const activeParameter = parameterText ? parameterText[1].split(",").length - 1 : 0;
            signatureHelp.activeParameter = activeParameter;
            resolve(signatureHelp);
        });
    }
}