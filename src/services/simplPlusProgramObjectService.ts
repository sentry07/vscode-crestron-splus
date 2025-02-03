import {
    DocumentSelector,
    ExtensionContext,
    TextDocument,
    window,
    workspace,
    TextDocumentChangeEvent,
    Disposable,
    Uri,
    Position,
    CompletionItemKind
} from "vscode";
import { SimplPlusObject } from "../base/simplPlusObject";
import { SimplPlusParser } from "../helpers/simplPlusParser";
export class SimplPlusProgramObjectService implements Disposable {

    private _documents = new Map<string, SimplPlusObject[]>();
    private static _instance: SimplPlusProgramObjectService;
    private selector: DocumentSelector = 'simpl-plus';
    public static getInstance(ctx: ExtensionContext): SimplPlusProgramObjectService {
        if (!SimplPlusProgramObjectService._instance && ctx) {
            SimplPlusProgramObjectService._instance = new SimplPlusProgramObjectService(ctx);
        }
        return SimplPlusProgramObjectService._instance;
    }
    public dispose() {
        this._documents.clear();
    }
    public getObjects(uri: Uri): SimplPlusObject[] | undefined {
        if (uri === undefined) { return undefined; }
        const token = this._documents.get(uri.toString());
        if (token === undefined) {return undefined;}
        return this._documents.get(uri.toString());
    }
    public getObjectAtPosition(uri: Uri, position: Position): SimplPlusObject {
        const objects = this.getObjects(uri);
        let object = objects.find(o=>o.blockRange?.contains(position)??false);
        //check if the position is inside a parameter
        if (object === undefined) {
            object = objects.filter(o=>o.kind===CompletionItemKind.Function).find(f=>f.children.some(ch=>ch.kind===(CompletionItemKind.TypeParameter??false) && (ch.blockRange?.contains(position)??false)));
        }
        return object;
    }

    private constructor(ctx: ExtensionContext) {
        const onOpenTextDocument_event = workspace.onDidOpenTextDocument((document) => this.updateOnOpenTextDocument(document));
        const onDidChangeTextDocument_event = workspace.onDidChangeTextDocument((editor) => this.updateOnDidChangeTextDocument(editor));
        const onCloseTextDocument_event = workspace.onDidCloseTextDocument((document) => this.updateOnCloseTextDocument(document));

        const document = window.activeTextEditor?.document;
        if (document !== undefined && document.languageId === this.selector.toString()) { this.tokenize(document); }

        ctx.subscriptions.push(
            onOpenTextDocument_event,
            onDidChangeTextDocument_event,
            onCloseTextDocument_event,
        );
    }
    private async updateOnCloseTextDocument(document: TextDocument): Promise<void> {
        if (document.languageId !== this.selector.toString()) { return; }
        this._documents.delete(document.uri.toString());
    }
    private async updateOnDidChangeTextDocument(editor: TextDocumentChangeEvent | undefined): Promise<void> {
        if (editor === undefined) { return; }
        const document = editor.document;
        if (document.languageId !== this.selector.toString()) { return; }
        await this.tokenize(document);
        const currentPosition = window.activeTextEditor?.selection.active;
    }
    private async updateOnOpenTextDocument(document: TextDocument): Promise<void> {
        if (document.languageId !== this.selector.toString()) { return; }
        await this.tokenize(document);
    }
    private async tokenize(document: TextDocument | undefined): Promise<void> {
        if (document === undefined) { return; }
        if (document.languageId !== this.selector.toString()) { return; }

        const theDocument: SimplPlusObject[] = await SimplPlusParser(document);
        this._documents.set(document.uri.toString(), theDocument);
    }
}