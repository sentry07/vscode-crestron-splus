import {
    ExtensionContext,
    Disposable,
    Uri,
    Position,
    CompletionItemKind,
    CompletionItem,
    SnippetString,
    CompletionItemLabel,
    TextDocument,
    Range,
    MarkdownString,
    window,
    EventEmitter,
    Event,
} from "vscode";
import { SimplPlusObject } from "../base/simplPlusObject";
import { SimplPlusProgramObjectService } from "./simplPlusProgramObjectService";
import { simplPlusApiObjectService } from "./simplPlusApiObjectService";
import { simpPlusLibraryObjectService } from "./simpPlusLibraryObjectService";
import * as helperFunctions from "../helpers/helperFunctions";

export class SimplPlusProjectObjectService implements Disposable {


    private static _instance: SimplPlusProjectObjectService;
    private _programObjectService: SimplPlusProgramObjectService;
    private _apiObjectService: simplPlusApiObjectService;
    private _libraryObjectService: simpPlusLibraryObjectService;

    private onLibrariesUpdatedEventEmitter = new EventEmitter<void>();
    public onLibrariesUpdated: Event<void> = this.onLibrariesUpdatedEventEmitter.event;

    public static getInstance(ctx: ExtensionContext): SimplPlusProjectObjectService {
        if (!SimplPlusProjectObjectService._instance && ctx) {
            SimplPlusProjectObjectService._instance = new SimplPlusProjectObjectService(ctx);
        }
        return SimplPlusProjectObjectService._instance;
    }
    private constructor(ctx: ExtensionContext) {
        this._programObjectService = SimplPlusProgramObjectService.getInstance(ctx);
        this._apiObjectService = simplPlusApiObjectService.getInstance(ctx);
        this._libraryObjectService = simpPlusLibraryObjectService.getInstance(ctx);

        this._apiObjectService.onApiListUpdated(() => {
            this.onLibrariesUpdatedEventEmitter.fire();
        });
        this._libraryObjectService.onLibraryListUpdated(() => {
            this.onLibrariesUpdatedEventEmitter.fire();
        });

    }
    public dispose() {
        this._programObjectService.dispose();
        this._apiObjectService.dispose();
    }
    public getProjectObjects(uri: Uri): SimplPlusObject[] | undefined {
        if (uri === undefined) { return undefined; }
        const projectObjects: SimplPlusObject[] = [];
        const programObjects = this._programObjectService.getObjects(uri);
        const apiObjects = this._apiObjectService.getObjects(uri);
        const libraryObjects = this._libraryObjectService.getObjects(uri);
        if (programObjects !== undefined) { projectObjects.push(...programObjects); }
        if (apiObjects !== undefined && apiObjects.length > 0) { projectObjects.push(...apiObjects); }
        if (libraryObjects !== undefined) { projectObjects.push(...libraryObjects); };
        return projectObjects;
    }

    public getProjectObjectByKind(uri: Uri, kinds: CompletionItemKind[]): SimplPlusObject[] {
        if (uri === undefined) { return []; }
        let objects: SimplPlusObject[] = [];
        const projectObjects = this.getProjectObjects(uri);
        for (const kind of kinds) {
            objects = objects.concat(projectObjects.filter(kd => kd.kind === kind));
        }
        return objects;
    }

    public async openApis(uri: Uri): Promise<void> {
        await this._apiObjectService.openLibraries(uri);
    }

    public async openLibraries(uri: Uri): Promise<void> {
        await this._libraryObjectService.openLibraries(uri);
    }

    public hasApis(uri: Uri): boolean {
        return this._apiObjectService.hasLibraries(uri);
    }

    public hasLibraries(uri: Uri): boolean {
        return this._libraryObjectService.hasLibraries(uri);
    }

    //returns the object (structure, event or function, or parameter range) that a position is inside of.
    // used to figure out what members to display during autocomplete
    public getProgramObjectAtPosition(uri: Uri, position: Position): SimplPlusObject | undefined {
        return this._programObjectService.getObjectAtPosition(uri, position);
    }
    isPositionAtFunctionParameter(functionObject: SimplPlusObject, position: Position): boolean {
        return functionObject.children.some(ch => ch.kind === CompletionItemKind.TypeParameter && (ch.blockRange?.contains(position) ?? false));
    }
    //Returns the member of object chain.  Matches as long as it is a full member (ends in .)
    //Used for next class member autocompletion (.)
    public getObjectAtPosition(document: TextDocument, position: Position): SimplPlusObject | undefined {
        const uri = document.uri;
        const offsetPosition = document.offsetAt(position);
        let textUntilPosition = document.getText().slice(0, offsetPosition);
        const objectChain = helperFunctions.objectChain(textUntilPosition);
        if (objectChain === undefined) { return undefined; }
        let currentObject: SimplPlusObject;
        const currentPosition = this.getProgramObjectAtPosition(uri, position);
        //only return object chain if inside a function or event
        if (currentPosition !== undefined && (currentPosition.kind === CompletionItemKind.Function || currentPosition.kind === CompletionItemKind.Event)) {
            let projectObjects = this.getProjectObjects(uri);
            let instances = projectObjects;
            let currentToken: string | undefined;
            currentToken = objectChain.shift();
            do {
                const instance = instances.find(co => co.name === currentToken);
                currentObject = projectObjects.find(po => po.name === instance.dataType);
                if (!currentObject || !(currentObject.children)) { break; }
                instances = currentObject.children;
                currentToken = objectChain.shift();
            } while (currentToken !== undefined);
            return currentObject;
        }
        return undefined;
    }

    //Returns the function of and object chain that ends in a method.  Matches as long as it is a full member (ends ( ))
    //Used for function param auto complete ( ( ) 
    public getFunctionAtPosition(document: TextDocument, position: Position): SimplPlusObject | undefined {
        const uri = document.uri;
        const offsetPosition = document.offsetAt(position);
        let textUntilPosition = document.getText().slice(0, offsetPosition);
        let textUntilParen = textUntilPosition.slice(0, textUntilPosition.lastIndexOf("(") + 1); //disregard attributes
        const objectChain = helperFunctions.objectChain(textUntilParen);
        if (objectChain === undefined) { return undefined; }
        const currentPosition = this.getProgramObjectAtPosition(uri, position);
        //only return object chain if inside a function or event
        if (currentPosition !== undefined && (currentPosition.kind === CompletionItemKind.Function || currentPosition.kind === CompletionItemKind.Event)) {
            let projectObjects = this.getProjectObjects(uri);

            //find first word in root objects
            let currentToken = objectChain.shift();
            let currentObject = projectObjects.find(co => co.name === currentToken);
            currentToken = objectChain.shift();

            //then for subsequent words in the found object children
            while (currentToken !== undefined) {
                const instance = projectObjects.find(po => po.name === currentObject.dataType);
                currentObject = instance.children.find(ch => ch.name === currentToken);
                currentToken = objectChain.shift();
            }
            return currentObject;
        }
        return undefined;
    }

    public getRootObjectByName(uri: Uri, name: string): SimplPlusObject | undefined {
        const documentMembers = this.getProjectObjects(uri);
        if (documentMembers === undefined) { return undefined; }
        return documentMembers.find(member => member.name === name);
    }
    public getChildObjectAtPositionByName(uri: Uri, name: string, position: Position): SimplPlusObject | undefined {
        const blockMember = this.getProgramObjectAtPosition(uri, position);
        if (blockMember === undefined) { return undefined; }
        return blockMember.children.find(member => member.name === name);
    }

    public getFunctionInfo(uri: Uri, tokenLabel: string): SimplPlusObject | undefined {
        const documentMembers = this.getProjectObjects(uri);
        if (documentMembers === undefined) { return undefined; }
        return documentMembers.find(member => member.name === tokenLabel && member.kind === CompletionItemKind.Function);
    }


    public getCompletionItemsFromObjects(objects: SimplPlusObject[]): CompletionItem[] {
        const activeDocUri = window.activeTextEditor?.document.uri.toString();
        if (objects === undefined) { return []; }
        const items: CompletionItem[] = objects.map(o => {
            let descriptionPrefix = "";
            //prefixes the libray name to the description if the object is not in the active document
            if (o.uri !== activeDocUri) {
                const currentObjectUri = o.uri ?? "";
                if (currentObjectUri !== "") {
                    const currentObjectName = currentObjectUri.slice(currentObjectUri.lastIndexOf("/") + 1, currentObjectUri.lastIndexOf("."));
                    descriptionPrefix = `${currentObjectName}: `;
                }
            }
            let itemLabel: CompletionItemLabel = {
                label: o.name,
                description: descriptionPrefix + o.dataType.toString()
            };
            let documentation: string = "";
            const item = new CompletionItem(itemLabel, o.kind);
            if (o.kind === CompletionItemKind.Function) {
                documentation += "```csharp\n";
                documentation += `${o.dataType} ${o.name}(`;
                const functionParameters = o.children.filter(c => c.kind === CompletionItemKind.TypeParameter);
                if (functionParameters.length > 0) {
                    documentation += functionParameters.map(p => `${p.dataType} ${p.name}`).join(", ");
                }
                documentation += ")\n```";
                const snippetString = new SnippetString();
                snippetString.appendText(o.name);
                snippetString.appendText("(");
                if (functionParameters.length > 0) {
                    functionParameters.forEach((parameter, index, parameters) => {
                        if (index > 0) { snippetString.appendText(", "); }
                        snippetString.appendPlaceholder(parameter.name);
                    });
                }
                else {
                    snippetString.appendTabstop();
                }
                snippetString.appendText(")");
                item.insertText = snippetString;
                item.command = {
                    command: "editor.action.triggerParameterHints",
                    title: "triggerSignatureHelp",
                };
            }
            item.documentation = new MarkdownString(documentation);
            return item;
        });
        return items;
    }
}