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
    extensions,
    RelativePattern,
    Event,
    EventEmitter
} from "vscode";
import { ApiParser } from "../helpers/apiParser";
import { SimplPlusObject } from "../base/simplPlusObject";
import { join } from "path";
import * as fs from "fs";

//  A specific usp might reference a clz.  Many usp might reference the same clz
//  a clz will generate an api file. The api file will be used to provide completion items.
//  This service will automatically generate an api on every clz change and generate its document tokens
//  Document tokens will not be cleared until the service is disposed.
//  The service will also stored the dlls that each usp uses.
//  The service will provide all tokens from all reference clz per usp document uri.
//  Token will be generated using the apiParser library that needs an API path to generate document tokens.

export class simplPlusApiObjectService implements Disposable {
    //Stores that watchers for a specific parent folder  where the .CLZ libraries are stored
    private _watchers = new Map<string, FileSystemWatcher>();
    //Stores tokens for a specific .CLZ Library
    private _apis = new Map<string, SimplPlusObject[]>();
    //stores the api paths that need tokens on a specific program.
    private _programs = new Map<string, string[]>();
    private static _instance: simplPlusApiObjectService;
    private selector: DocumentSelector = 'simpl-plus';
    public static getInstance(ctx: ExtensionContext): simplPlusApiObjectService {
        if (!simplPlusApiObjectService._instance) {
            simplPlusApiObjectService._instance = new simplPlusApiObjectService(ctx);
        }
        return simplPlusApiObjectService._instance;
    }
    private onApiListUpdatedEventEmitter = new EventEmitter<void>();
    public onApiListUpdated: Event<void> = this.onApiListUpdatedEventEmitter.event;

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
        this._apis.clear();
        this._watchers.forEach(u => u.dispose());
        this._watchers.clear();
    }

    public getObjects(uri: Uri): SimplPlusObject[] {
        if (uri === undefined) { return []; }
        const documentTokens: SimplPlusObject[] = [];
        this._programs.get(uri.toString())?.forEach((library) => {
            const tokens = this._apis.get(library);
            if (tokens) {
                documentTokens.push(...tokens);
            }
        });
        return documentTokens;
    }

    public async openLibraries(uri: Uri): Promise<void> {
        if (uri === undefined) { return; }
        const librariesToOpen = this._programs.get(uri.toString());
        if (librariesToOpen === undefined) { return; }
        librariesToOpen.forEach(async (library) => {
            const workSpaceFolder = library.slice(0, library.lastIndexOf("\\"));
            const libraryName = library.slice(library.lastIndexOf("\\") + 1, library.lastIndexOf("."));
            const CLZFullPath = join(workSpaceFolder, "SPlsWork", libraryName + ".api");
            if (!fs.existsSync(CLZFullPath)) { return; }
            const doc = await workspace.openTextDocument(CLZFullPath);
            await window.showTextDocument(doc);
        });

    }

    public hasLibraries(uri: Uri): boolean {
        if (uri === undefined) { return false; }
        const apis = this._programs.get(uri.toString())?.length ?? 0;
        return apis > 0;
    }

    private async updateOnCloseTextDocument(document: TextDocument): Promise<void> {
        if (document.languageId !== this.selector.toString()) { return; }
        const documentUri = document.uri.toString();
        this._programs.delete(documentUri);
        this.onApiListUpdatedEventEmitter.fire();
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

    private async tokenize(document: TextDocument): Promise<void> {
        let libraryMatches: string[] = [];
        let inComment = false;
        //searches through documents for instances of simplsharp libraries while ignoring commented lines
        for (let line = 0; line < document.lineCount; line++) {
            const lineText = document.lineAt(line).text;
            if (lineText.includes("//")) { continue; }
            if (lineText.includes("/*")) { inComment = true; }
            if (lineText.includes("*/")) { inComment = false; }
            if (inComment) { continue; }
            const libraryMatch = lineText.match(/#USER_SIMPLSHARP_LIBRARY "(.*)"/i);
            if (libraryMatch) {
                libraryMatches.push(libraryMatch[1]);
            }
        }
        if (libraryMatches.length === 0) {
            return;
        }
        const documentParentFolder = document.uri.fsPath.slice(0, document.uri.fsPath.lastIndexOf("\\"));
        //if the there are no watchers for the document's parent folder, create a new watcher and set listeners
        if (!this._watchers.has(documentParentFolder)) {
            const clzWatcherPath = new RelativePattern(documentParentFolder, '*.clz');
            const fsWatcher = workspace.createFileSystemWatcher(clzWatcherPath);
            this._watchers.set(documentParentFolder, fsWatcher);
            fsWatcher.onDidChange((e) => { this.updateLibrary(e); });
            fsWatcher.onDidCreate((e) => { this.updateLibrary(e); });
            fsWatcher.onDidDelete((e) => { this.deleteLibrary(e); });
        }
        //store tokens for each CLZ Library
        const clzDocuments: string[] = [];
        for (const library of libraryMatches) {
            const CLZFullPath = join(documentParentFolder, library + ".clz");
            const apiFullPath = join(documentParentFolder, "SPlsWork", library + ".api");
            if (!fs.existsSync(CLZFullPath)) { continue; }
            clzDocuments.push(CLZFullPath);
            if (!this._apis.has(CLZFullPath) || !fs.existsSync(apiFullPath)) {
                //immediately store empty array to prevent multiple API generation
                let apiTokens: SimplPlusObject[] = [];
                this._apis.set(CLZFullPath, apiTokens);
                // Generate API File from CLZ
                try {
                    await this.runApiGenerator(CLZFullPath);
                }
                catch (error) {
                    await window.showErrorMessage(error);
                }
                //generate API Tokens
                const apiFile = join(documentParentFolder, "SPlsWork", library + ".api");
                apiTokens = await ApiParser(apiFile);
                if (apiTokens === undefined || apiTokens.length === 0) { continue; }
                this._apis.set(CLZFullPath, apiTokens);
            }
        };
        this._programs.set(document.uri.toString(), clzDocuments);
        this.onApiListUpdatedEventEmitter.fire();
    }
    private deleteLibrary(uri: Uri) {
        if (uri === undefined) { return; }
        //check if one of the stored CLZ libraries has been deleted
        const CLZPathToCheck = uri.fsPath.slice(0, uri.fsPath.lastIndexOf(".")) + ".clz";
        if (!this._apis.has(CLZPathToCheck)) { return; }
        //if it has, remove tokens
        this._apis.delete(CLZPathToCheck);
    }
    private async updateLibrary(uri: Uri) {
        if (uri === undefined) { return; }
        //check if one of the stored CLZ libraries has been updated or created
        const library = uri.fsPath.slice(uri.fsPath.lastIndexOf("\\") + 1, uri.fsPath.lastIndexOf("."));
        const CLZPath = uri.fsPath.slice(0, uri.fsPath.lastIndexOf(".")) + ".clz";
        const documentParentFolder = uri.fsPath.slice(0, uri.fsPath.lastIndexOf("\\"));
        if (!this._apis.has(CLZPath)) { return; }
        //if it has, generate API Tokens
        // Generate API File from CLZ
        try {
            await this.runApiGenerator(CLZPath);
        }
        catch (error) {
            await window.showErrorMessage(error);
        }
        // and store them
        const apiFile = join(documentParentFolder, "SPlsWork", library + ".api");
        const apiTokens = await ApiParser(apiFile);
        this._apis.set(CLZPath, apiTokens);
    }

    private async runApiGenerator(CLZLibraryPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const simplDirectory = workspace.getConfiguration("simpl-plus").simplDirectory;
            if (!fs.existsSync(simplDirectory)) { reject("SIMPL+ Extension Directory not found. Check configuration"); return; }
            const extensionPath = extensions.getExtension("sentry07.simpl-plus")?.extensionPath;
            if (extensionPath === undefined) { resolve(); }
            const simpPlusApiGeneratorPath = join(extensionPath, "support", "SimplPlusApiGenerator.exe");
            if (!fs.existsSync(simpPlusApiGeneratorPath)) { reject("SIMPL+ API Generator not found. Reinstall Extension"); return; }

            let buildCommand = `.\"${simpPlusApiGeneratorPath}\" \"${CLZLibraryPath}\" \"${simplDirectory}\"`;

            // Execute a command in a terminal immediately after being created
            const apiTerminal = window.createTerminal();
            let isBuilding = false;
            window.onDidChangeTerminalShellIntegration(async ({ terminal, shellIntegration }) => {
                if (terminal === apiTerminal && !isBuilding) {
                    //prevents from executing the command for every change on the terminal
                    isBuilding = true;
                    const execution = shellIntegration.executeCommand(buildCommand);
                    window.onDidEndTerminalShellExecution(event => {
                        if (event.terminal === apiTerminal) {
                            if (event.execution === execution) {
                                if (event.exitCode === 0) {
                                    resolve();
                                } else {
                                    reject(`API Build failed with exit code ${event.exitCode}`);
                                }
                            }
                            apiTerminal.hide();
                            apiTerminal.dispose();
                            isBuilding = false;
                        }
                    });
                }
            });
        });
    }
}