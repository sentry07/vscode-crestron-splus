import {
    Disposable,
    TextDocument,
    Uri,
    DocumentSelector,
    ExtensionContext,
    workspace,
    window,
    TextDocumentChangeEvent,
    FileSystemWatcher,
    RelativePattern,
    EventEmitter,
    Event
} from "vscode";
import { SimplPlusParser } from "../helpers/simplPlusParser";
import { SimplPlusObject } from "../base/simplPlusObject";
import { join } from "path";
import * as fs from "fs";


export class simpPlusLibraryObjectService implements Disposable {
    //Stores that watchers for a specific parent folder  where the .usl libraries are stored
    private _watchers = new Map<string, FileSystemWatcher>();
    //Stores tokens for a specific usl Library
    private _libraries = new Map<string, SimplPlusObject[]>();
    //stores the library paths that need tokens on a specific program.
    private _programs = new Map<string, string[]>();
    private static _instance: simpPlusLibraryObjectService;
    private selector: DocumentSelector = 'simpl-plus';
    public static getInstance(ctx: ExtensionContext): simpPlusLibraryObjectService {
        if (!simpPlusLibraryObjectService._instance) {
            simpPlusLibraryObjectService._instance = new simpPlusLibraryObjectService(ctx);
        }
        return simpPlusLibraryObjectService._instance;
    }
    private onLibraryListUpdatedEventEmitter = new EventEmitter<void>();
    public onLibraryListUpdated: Event<void> = this.onLibraryListUpdatedEventEmitter.event;

    private constructor(ctx: ExtensionContext) {
        const onOpenTextDocument_event = workspace.onDidOpenTextDocument((document) => this.updateOnOpenTextDocument(document));
        const onDidChangeTextDocument_event = workspace.onDidChangeTextDocument((editor) => this.updateOnDidChangeTextDocument(editor));
        const onCloseTextDocument_event = workspace.onDidCloseTextDocument((document) => this.updateOnCloseTextDocument(document));
        ctx.subscriptions.push(
            onOpenTextDocument_event,
            onDidChangeTextDocument_event,
            onCloseTextDocument_event,
        );
        const document = window.activeTextEditor?.document;
        if (document !== undefined && document.languageId === this.selector.toString()) { this.tokenize(document); }

    }
    public dispose() {
        this._libraries.clear();
        this._watchers.forEach(u => u.dispose());
        this._watchers.clear();
    }

    public getObjects(uri: Uri): SimplPlusObject[] {
        if (uri===undefined) {return [];}
        const documentTokens: SimplPlusObject[] = [];
        this._programs.get(uri.toString())?.forEach((library) => {
            const tokens = this._libraries.get(library);
            if (tokens) {
                documentTokens.push(...tokens);
            }
        });
        return documentTokens;
    }

    public async openLibraries(uri: Uri): Promise<void> {
        if (uri===undefined) {return; }
        const librariesToOpen = this._programs.get(uri.toString());
        if (librariesToOpen === undefined) { return; }
        librariesToOpen.forEach(async (library) => {
            if (!fs.existsSync(library)) { return; }
            const doc = await workspace.openTextDocument(library);
            await window.showTextDocument(doc);
        });
    }

    public hasLibraries(uri: Uri): boolean {
        if (uri===undefined) {return false;}
        const apis = this._programs.get(uri.toString())?.length ?? 0;
        return apis > 0;
    }

    private async updateOnCloseTextDocument(document: TextDocument): Promise<void> {
        if (document.languageId !== this.selector.toString()) { return; }
        this._programs.delete(document.uri.toString());
        this.onLibraryListUpdatedEventEmitter.fire();
    }
    private async updateOnDidChangeTextDocument(editor: TextDocumentChangeEvent | undefined): Promise<void> {
        if (editor === undefined) { return; }
        const document = editor.document;
        if (document.languageId !== this.selector.toString()) { return; }
        await this.tokenize(document);
    }
    private async updateOnOpenTextDocument(document: TextDocument): Promise<void> {
        if (document.languageId !== this.selector.toString()) { return; }
        await this.tokenize(document);
    }
    private deleteLibrary(uri: Uri) {
        if (uri===undefined) {return; }
        //check if one of the stored USL libraries has been deleted
        const UslPathToCheck = uri.fsPath.slice(0, uri.fsPath.lastIndexOf(".")) + ".usl";
        if (!this._libraries.has(UslPathToCheck)) { return; }
        //if it has, remove tokens
        this._libraries.delete(UslPathToCheck);
    }
    private async updateLibrary(uri: Uri) {
        if (uri===undefined) {return; }
        //check if one of the stored USL libraries has been updated or created
        const UslPath = uri.fsPath;
        if (!this._libraries.has(UslPath)) { return; }
        // and store them
        //@ts-ignore
        const uslDocument = await workspace.openTextDocument(UslPath);
        const uslTokens = await SimplPlusParser(uslDocument);
        this._libraries.set(UslPath, uslTokens);
    }

    private async tokenize(document: TextDocument | undefined): Promise<void> {
        if (document === undefined) { return; }
        if (document.languageId !== this.selector.toString()) { return; }
        let libraryMatches: string[] = [];
        let inComment = false;
        //searches through documents for instances of simpl plus libraries while ignoring commented lines
        for (let line = 0; line < document.lineCount; line++) {
            const lineText = document.lineAt(line).text;
            if (lineText.includes("//")) { continue; }
            if (lineText.includes("/*")) { inComment = true; }
            if (lineText.includes("*/")) { inComment = false; }
            if (inComment) { continue; }
            const libraryMatch = lineText.match(/#USER_LIBRARY "(.*)"/i);
            if (libraryMatch) {
                libraryMatches.push(libraryMatch[1]);
            }
        }
        if (libraryMatches.length === 0) {
            return;
        }
        const documentFolder = document.uri.fsPath.slice(0, document.uri.fsPath.lastIndexOf("\\"));
        //if the there are no watchers for the document's parent folder, create a new watcher and set listeners
        if (!this._watchers.has(documentFolder)) {
            const uslWatcherPath = new RelativePattern(documentFolder, '*.usl');
            const fsWatcher = workspace.createFileSystemWatcher(uslWatcherPath);
            fsWatcher.onDidChange((e) => { this.updateLibrary(e); });
            fsWatcher.onDidCreate((e) => { this.updateLibrary(e); });
            fsWatcher.onDidDelete((e) => { this.deleteLibrary(e); });
            this._watchers.set(documentFolder, fsWatcher);
        }
        //store tokens for each USL Library
        const uslDocuments: string[] = [];
        for (const library of libraryMatches) {
            const UslFullPath = join(documentFolder, library + ".usl");
            if (!fs.existsSync(UslFullPath)) { continue; }
            uslDocuments.push(UslFullPath);
            if (!this._libraries.has(UslFullPath)) {
                //generate API Tokens
                const uslDocument = await workspace.openTextDocument(UslFullPath);
                const apiTokens = await SimplPlusParser(uslDocument);
                this._libraries.set(UslFullPath, apiTokens);
            }
        };
        this._programs.set(document.uri.toString(), uslDocuments);
        this.onLibraryListUpdatedEventEmitter.fire();

    }
}