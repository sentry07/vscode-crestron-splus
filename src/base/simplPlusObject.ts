import { Range, CompletionItemKind } from "vscode";


export type SimplPlusObject = {
    name: string;
    kind: CompletionItemKind;
    nameRange: Range;
    dataType: string;
    dataTypeModifier: string;
    uri: string;
    blockRange?: Range;
    parent?: SimplPlusObject;
    children: SimplPlusObject[];
}