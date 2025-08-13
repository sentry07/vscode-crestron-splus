import * as path from "path";
import { BuildType } from "./base/build-type";
import { existsSyncWrapper } from "./helpers/fsExistsSyncWrapper";
import { readFileSyncWrapper } from "./helpers/fsReadSyncWrapper";
import { workspace, TextDocument, Uri, Disposable } from 'vscode';

class SimplPlusDocumentBuildTargets {
    private _document: TextDocument | undefined;
    public get Document() { return this._document; }

    private buildTypes: BuildType[] = [];
    public get BuildType() { return this.buildTypes; }

    public constructor(document: TextDocument | undefined) {
        if (document === undefined) { return; }
        if (document.languageId !== "simpl-plus") { return; }
        this._document = document;
        this.UpdatedBuildTargets(document);
    }

    public UpdatedBuildTargets(document: TextDocument, newTargets?: BuildType[]): BuildType[] | undefined {
        if (this._document !== document) { return undefined; }
        if (newTargets !== undefined) {
            this.buildTypes = newTargets;
            return this.buildTypes;
        }
        if (this._document.isUntitled) {
            this.buildTypes = this.getBuildTargetsFromPreferences();
            return;
        }
        if (this.isUshFileExists(this._document.uri)) {
            this.buildTypes = this.getBuildTargetsFromUshFile(this._document.uri);
            return;
        }
        this.buildTypes = this.getBuildTargetsFromPreferences();
        return this.buildTypes;
    }

    private isUshFileExists(filePath: Uri): boolean {
        if (filePath === undefined) { return false; }
        const docPath = path.parse(filePath.fsPath);
        const ushFilePath = path.join(docPath.dir, docPath.name + ".ush");
        return existsSyncWrapper(ushFilePath);
    }

    private getBuildTargetsFromUshFile(filePath: Uri): BuildType[] {
        if (filePath === undefined) { return; }
        const docPath = path.parse(filePath.fsPath);
        const ushFilePath = path.join(docPath.dir, docPath.name + ".ush");
        const ushContent = readFileSyncWrapper(ushFilePath);
        const regex = /(?:Inclusions_CDS=)(.*)/;
        const match = ushContent.match(regex);
        if (match && match[1]) {
            let fileBuildTypes: BuildType[] = [];
            if (match[1].includes("5")) { fileBuildTypes.push("Series2"); }
            if (match[1].includes("6")) { fileBuildTypes.push("Series3"); }
            if (match[1].includes("7")) { fileBuildTypes.push("Series4"); }
            return fileBuildTypes;
        }
        return this.getBuildTargetsFromPreferences();
    }

    private getBuildTargetsFromPreferences(): BuildType[] {
        let fileBuildTypes: BuildType[] = [];
        const simplConfig = workspace.getConfiguration("simpl-plus");
        workspace.getConfiguration("simpl-plus").enable2series === true ? fileBuildTypes.push("Series2") : null;
        workspace.getConfiguration("simpl-plus").enable3series === true ? fileBuildTypes.push("Series3") : null;
        workspace.getConfiguration("simpl-plus").enable4series === true ? fileBuildTypes.push("Series4") : null;
        return fileBuildTypes;
    }
}

export class SimplPlusActiveDocuments implements Disposable {

    private _SimpPlusDocuments: SimplPlusDocumentBuildTargets[] = [];

    public GetSimplPlusDocumentBuildTargets(document: TextDocument | undefined): BuildType[] {
        let simplPlusDocument = this._SimpPlusDocuments.find(sd => sd.Document?.fileName === document?.fileName);
        if (simplPlusDocument === undefined) {
            simplPlusDocument = new SimplPlusDocumentBuildTargets(document);
            this._SimpPlusDocuments.push(simplPlusDocument);
        }
        return simplPlusDocument.BuildType;
    }

    public RemoveSimpPlusDocument(document: TextDocument): void {
        let simplPlusDocumentIndex = this._SimpPlusDocuments.findIndex(sd => sd.Document?.fileName === document.fileName);
        if (simplPlusDocumentIndex === -1) { return; }
        this._SimpPlusDocuments.splice(simplPlusDocumentIndex, 1);
    }

    public UpdateSimpPlusDocumentBuildTargets(document: TextDocument, newTarget?: BuildType[]): BuildType[] | undefined {
        let simplPlusDocument = this._SimpPlusDocuments.find(sd => sd.Document?.fileName === document.fileName);
        if (simplPlusDocument === undefined) { return undefined; }
        return simplPlusDocument.UpdatedBuildTargets(document, newTarget);
    }
    RemoveAllSimpPlusDocuments() {
        this._SimpPlusDocuments = [];
    }
    dispose() {
        this.RemoveAllSimpPlusDocuments();
    }
}
