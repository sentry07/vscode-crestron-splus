import { CompletionItemKind, Position, Range, TextDocument } from "vscode";
import { SimplPlusObject } from "../base/simplPlusObject";
import TextmateLanguageService, { TextmateToken } from "vscode-textmate-languageservice";

const selector: string = 'simpl-plus';
let programName: string = "";
let programUri: string = "";

//parses an usp or usl fle to create SimplObject hierarchy per variables, functions, structures, events and constants
export async function SimplPlusParser(document: TextDocument | undefined): Promise<SimplPlusObject[]> {
    if (document === undefined) { return; }
    if (document.languageId !== selector) { return; }
    const textmateService = new TextmateLanguageService(selector);
    const textmateTokenService = await textmateService.initTokenService();
    const tokens = await textmateTokenService.fetch(document);
    const fileName = document.fileName;
    programName = fileName.slice(fileName.lastIndexOf("\\"), fileName.lastIndexOf("."));
    programUri = document.uri.toString();

    const theDocument: SimplPlusObject[] =
        [
            ...getGlobalStructures(tokens),
            ...getGlobalConstants(tokens),
            ...getGlobalVariables(tokens),
            ...getGlobalFunctions(tokens),
            ...getGlobalEvents(tokens),
        ];
    return theDocument;
}

function getGlobalVariables(tokens: TextmateToken[]): SimplPlusObject[] {
    return tokens.filter(token => token.scopes.includes("entity.name.variable.usp")
        && !(token.scopes.includes("meta.block.structure.usp")
            || token.scopes.includes("meta.block.usp"))).map(token => {
                const variableInfo = getType(token, tokens);
                const variableNameRange = new Range(
                    new Position(token.line, token.startIndex),
                    new Position(token.line, token.startIndex + token.text.length)
                );
                const variable: SimplPlusObject = {
                    name: token.text,
                    kind: CompletionItemKind.Variable,
                    nameRange: variableNameRange,
                    dataType: variableInfo.type,
                    dataTypeModifier: variableInfo.modifier,
                    children: [],
                    uri: programUri,
                };
                return variable;
            });
}
function getGlobalConstants(tokens: TextmateToken[]): SimplPlusObject[] {
    return tokens.filter(token => token.scopes.includes("entity.name.constant.usp")).map(token => {
        const constantNameRange = new Range(
            new Position(token.line, token.startIndex),
            new Position(token.line, token.startIndex + token.text.length)
        );
        const constantIndex = tokens.indexOf(token);
        let dataType = "";
        if (constantIndex + 2 < tokens.length) {
            const constantValueToken = tokens[constantIndex + 2];
            switch (constantValueToken.type) {
                case "constant.numeric.decimal.usp":
                case "constant.numeric.hex.usp":
                case "constant.numeric.character.usp":
                case "constant.character.usp":
                case "constant.numeric.other.prefix.hex.usp":
                    dataType = "integer";
                    break;
                case "string.quoted.double.usp":
                    dataType = "string";
                default:
                    break;
            }
        }
        const constant: SimplPlusObject = {
            name: token.text,
            kind: CompletionItemKind.Constant,
            nameRange: constantNameRange,
            dataType,
            dataTypeModifier: "",
            children: [],
            uri: programUri,
        };
        return constant;
    });
}
function getGlobalFunctions(tokens: TextmateToken[]): SimplPlusObject[] {
    return tokens.filter(token => token.scopes.includes("entity.name.function.usp")).map(token => {
        const functionInfo = getType(token, tokens);
        const functionNameRange = new Range(
            new Position(token.line, token.startIndex),
            new Position(token.line, token.startIndex + token.text.length)
        );
        //look for function block statement range
        const functionTokens = getBlockRangeTokens(tokens, token, "meta.block.usp");
        let functionBlockRange: Range;
        let functionVariables: SimplPlusObject[] = [];
        const fun: SimplPlusObject = {
            name: token.text,
            kind: CompletionItemKind.Function,
            nameRange: functionNameRange,
            dataType: functionInfo.type,
            dataTypeModifier: functionInfo.modifier,
            uri: programUri,
            children: []
        };
        //check for function with empty statements
        if (functionTokens.length !== 0) {
            functionBlockRange = new Range(
                new Position(functionTokens[0].line, functionTokens[0].startIndex),
                new Position(functionTokens[functionTokens.length - 1].line,
                    functionTokens[functionTokens.length - 1].startIndex + functionTokens[functionTokens.length - 1].text.length)
            );
            fun.blockRange = functionBlockRange;
            //grab all variables from range
            functionVariables = functionTokens.
                filter(token => token.scopes.includes("entity.name.variable.usp")).
                map(token => {
                    const variableInfo = getType(token, tokens);
                    const variableNameRange = new Range(
                        new Position(token.line, token.startIndex),
                        new Position(token.line, token.startIndex + token.text.length)
                    );
                    const variable: SimplPlusObject = {
                        name: token.text,
                        kind: CompletionItemKind.Variable,
                        nameRange: variableNameRange,
                        dataType: variableInfo.type,
                        dataTypeModifier: variableInfo.modifier,
                        children: [],
                        uri: programUri,
                        parent: fun
                    };
                    return variable;
                });
        }
        //grab all tokens inside the parenthesized parameter list
        const parameterTokens = getBlockRangeTokens(tokens, token, "meta.parenthesized.parameter-list.usp");
        let functionParameters: SimplPlusObject[] = [];
        let parameterBlockRange: Range;
        if (parameterTokens.length !== 0) {
            parameterBlockRange = new Range(
                new Position(parameterTokens[0].line, parameterTokens[0].startIndex),
                new Position(parameterTokens[parameterTokens.length - 1].line,
                    parameterTokens[parameterTokens.length - 1].startIndex + parameterTokens[parameterTokens.length - 1].text.length)
            );
            //extract parameter variable names
            functionParameters = parameterTokens.
                filter(token => token.scopes.includes("entity.name.variable.parameter.usp")).
                map(token => {
                    const parameterInfo = getType(token, tokens);
                    const parameterNameRange = new Range(
                        new Position(token.line, token.startIndex),
                        new Position(token.line, token.startIndex + token.text.length)
                    );
                    const parameter: SimplPlusObject = {
                        name: token.text,
                        kind: CompletionItemKind.TypeParameter,
                        nameRange: parameterNameRange,
                        dataType: parameterInfo.type,
                        dataTypeModifier: parameterInfo.modifier,
                        children: [],
                        blockRange: parameterBlockRange,
                        uri: programUri,
                        parent: fun
                    };
                    return parameter;
                });
                //if no parameters are found, create a single empty parameter that stores the parameter block range
            if (functionParameters === undefined || functionParameters.length === 0) { 
                functionParameters = [{
                    name: "",
                    kind: CompletionItemKind.TypeParameter,
                    nameRange: new Range(new Position(0, 0), new Position(0, 0)),
                    dataType: "",
                    dataTypeModifier: "",
                    children: [],
                    blockRange: parameterBlockRange,
                    uri: programUri,
                    parent: fun
                }]; 
            }
        }
        fun.children = [...functionParameters, ...functionVariables];
        return fun;
    });
}
function getGlobalStructures(tokens: TextmateToken[]): SimplPlusObject[] {
    return tokens.filter(token => token.scopes.includes("entity.name.type.structure.usp")).map(token => {
        const structureNameRange = new Range(
            new Position(token.line, token.startIndex),
            new Position(token.line, token.startIndex + token.text.length)
        );
        const struct: SimplPlusObject = {
            name: token.text,
            kind: CompletionItemKind.Struct,
            nameRange: structureNameRange,
            dataType: token.text,
            dataTypeModifier: "",
            children: [],
            uri: programUri,
        };
        //look for structure block statement range
        const structureTokens = getBlockRangeTokens(tokens, token, "meta.block.structure.usp");
        let structureVariables: SimplPlusObject[] = [];
        //check for structure with empty elements
        if (structureTokens.length !== 0) {
            const structureBlockRange = new Range(
                new Position(structureTokens[0].line, structureTokens[0].startIndex),
                new Position(structureTokens[structureTokens.length - 1].line, structureTokens[structureTokens.length - 1].startIndex + structureTokens[structureTokens.length - 1].text.length)
            );
            struct.blockRange = structureBlockRange;
            //grab all variables from range
            structureVariables = structureTokens.
                filter(token => token.scopes.includes("entity.name.variable.usp")).
                map(token => {
                    const variableInfo = getType(token, tokens);
                    const variableNameRange = new Range(
                        new Position(token.line, token.startIndex),
                        new Position(token.line, token.startIndex + token.text.length)
                    );
                    const variable: SimplPlusObject = {
                        name: token.text,
                        kind: CompletionItemKind.Variable,
                        nameRange: variableNameRange,
                        dataType: variableInfo.type,
                        dataTypeModifier: variableInfo.modifier,
                        children: [],
                        uri: programUri,
                        parent: struct
                    };
                    return variable;
                });
        }
        struct.children = [...structureVariables];
        return struct;
    });
}
function getGlobalEvents(tokens: TextmateToken[]): SimplPlusObject[] {
    return tokens.filter(token => token.scopes.includes("entity.name.variable.event.usp")).map(token => {
        const eventTypeInfo = getType(token, tokens);
        const eventNameRange = new Range(
            new Position(token.line, token.startIndex),
            new Position(token.line, token.startIndex + token.text.length)
        );
        //look for event block statement range
        const eventTokens = getBlockRangeTokens(tokens, token, "meta.block.usp");
        const eventBlockRange = new Range(
            new Position(eventTokens[0].line, eventTokens[0].startIndex),
            new Position(eventTokens[eventTokens.length - 1].line, eventTokens[eventTokens.length - 1].startIndex + eventTokens[eventTokens.length - 1].text.length)
        );
        const event: SimplPlusObject = {
            name: token.text,
            kind: CompletionItemKind.Event,
            nameRange: eventNameRange,
            dataType: eventTypeInfo.type,
            dataTypeModifier: eventTypeInfo.modifier,
            blockRange: eventBlockRange,
            children: [],
            uri: programUri,
        };
        //grab all variables from range
        const eventVariables = eventTokens.
            filter(token => token.scopes.includes("entity.name.variable.usp")).
            map(token => {
                const variableTypeInfo = getType(token, tokens);
                const variableNameRange = new Range(
                    new Position(token.line, token.startIndex),
                    new Position(token.line, token.startIndex + token.text.length)
                );
                const variable: SimplPlusObject = {
                    name: token.text,
                    kind: CompletionItemKind.Variable,
                    nameRange: variableNameRange,
                    dataType: variableTypeInfo.type,
                    dataTypeModifier: variableTypeInfo.modifier,
                    children: [],
                    uri: programUri,
                    parent: event
                };
                return variable;
            });
        event.children = [...eventVariables];
        return event;
    });
}
function getType(token: TextmateToken, tokens: TextmateToken[]): { type: string, modifier: string } {
    let tokenIndex = tokens.indexOf(token);
    if (tokenIndex < 0) { return { type: "", modifier: "" }; }
    do {
        --tokenIndex;
    } while (tokenIndex >= 0 && !(tokens[tokenIndex].type.includes("keyword.type") || tokens[tokenIndex].type.includes("entity.name.type")));
    if (tokenIndex < 0) { return { type: "", modifier: "" }; }
    let type: string = tokens[tokenIndex].text;
    if (type.match(/CMutex|CEvent|Tcp_Client|Tcp_Server|Udp_Socket/i)) {
        return { type, modifier: "BuiltIn" };
    }
    if (type.match(/eventHandler/i)) {
        return { type: "void", modifier: type };
    }
    const functionTypeMatch = type.match(/(?:(LONG_INTEGER|INTEGER|SIGNED_INTEGER|SIGNED_LONG_INTEGER|STRING)_)?FUNCTION/i);
    if (functionTypeMatch) {
        type = !functionTypeMatch[1] ? "void" : functionTypeMatch[1];
    }
    let modifier = "";
    --tokenIndex;
    --tokenIndex;
    if (tokenIndex >= 0 && (tokens[tokenIndex].type.includes("storage.modifier"))) {
        modifier = tokens[tokenIndex].text;
    }
    const specialModifier = type.match(/(LONG_INTEGER|INTEGER|SIGNED_INTEGER|SIGNED_LONG_INTEGER|BUFFER|STRING|ANALOG|DIGITAL)_(INPUT|OUTPUT|PARAMETER)/i);
    if (modifier === "" && specialModifier) {
        modifier = specialModifier[2];
    }
    return { type, modifier };
}


function getBlockRangeTokens(tokens: TextmateToken[], token: TextmateToken, scopeName: string): TextmateToken[] {
    let functionTokenBegin = tokens.indexOf(token);
    do {
        if (tokens[functionTokenBegin].scopes.includes(scopeName)) { break; }
        ++functionTokenBegin;
    } while (functionTokenBegin < tokens.length);
    if (functionTokenBegin >= tokens.length) { return []; }
    let functionTokenEnd = functionTokenBegin;
    do {
        if (!tokens[functionTokenEnd].scopes.includes(scopeName)) { break; }
        ++functionTokenEnd;
    } while (functionTokenEnd < tokens.length);
    return tokens.slice(functionTokenBegin, functionTokenEnd);
}