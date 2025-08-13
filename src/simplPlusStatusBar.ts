import {
    window,
    StatusBarAlignment,
    StatusBarItem,
    ExtensionContext,
    commands, workspace,
    QuickPickItem,
    QuickPickOptions,
    TextDocument,
    TextEditor
} from 'vscode';
import { SimplPlusActiveDocuments } from "./simplPlusActiveDocuments";
import { BuildType } from './base/build-type';

export class SimplPlusStatusBar {
    private _statusBar: StatusBarItem;
    public static instance: SimplPlusStatusBar;
    private _simplPlusDocuments: SimplPlusActiveDocuments;

    public static getInstance(ctx?: ExtensionContext): SimplPlusStatusBar {
        if (!SimplPlusStatusBar.instance && ctx) {
            SimplPlusStatusBar.instance = new SimplPlusStatusBar(ctx);
        }
        return SimplPlusStatusBar.instance;
    }

    private constructor(ctx?: ExtensionContext) {
        this._statusBar = window.createStatusBarItem(StatusBarAlignment.Right, 100);
        this._statusBar.text = "SIMPL+";
        this._statusBar.tooltip = "Click to select SIMPL+ compilation targets";
        this._statusBar.command = "simpl-plus.showQuickPick";
        this._simplPlusDocuments = new SimplPlusActiveDocuments();


        let showQuickPick_command = commands.registerCommand("simpl-plus.showQuickPick", async () => this.showQuickPick());

        let onChangeActiveTextEditor_event = window.onDidChangeActiveTextEditor((editor) => this.updateOnChangeActiveTextEditor(editor));
        let onCloseTextDocument_event = workspace.onDidCloseTextDocument((document) => this.updateOnCloseTextDocument(document));

        ctx?.subscriptions.push(
            showQuickPick_command,
            // onOpenTextDocument_event,
            onChangeActiveTextEditor_event,
            onCloseTextDocument_event,
            this._statusBar,
            this._simplPlusDocuments
        );


        const activeEditor = window.activeTextEditor;
        if (activeEditor === undefined || activeEditor.document.languageId !== "simpl-plus") {
            this.updateBuildTargetsStatusBar([]);
            return;
        }

        const currentBuildTargets = this._simplPlusDocuments.GetSimplPlusDocumentBuildTargets(activeEditor.document);
        this.updateBuildTargetsStatusBar(currentBuildTargets);
    }

    private async showQuickPick() {
        const activeEditor = window.activeTextEditor;
        if (activeEditor !== undefined) {
            const currentBuildTargets = this._simplPlusDocuments.GetSimplPlusDocumentBuildTargets(activeEditor.document);
            const newBuildTargets = await this.showBuildTargetsQuickPick(currentBuildTargets);
            if (newBuildTargets === undefined) { return; }
            const updatedBuildTargets = this._simplPlusDocuments.UpdateSimpPlusDocumentBuildTargets(activeEditor.document, newBuildTargets);
            if (updatedBuildTargets === undefined) { return; }
            this.updateBuildTargetsStatusBar(updatedBuildTargets);
        }
    }

    private updateOnCloseTextDocument(document: TextDocument) {
        if (document.languageId !== "simpl-plus") {
            return;
        }
        this._simplPlusDocuments.RemoveSimpPlusDocument(document);
    }
    private updateOnChangeActiveTextEditor(editor: TextEditor | undefined) {
        if (editor === undefined || editor.document.languageId !== "simpl-plus") {
            this.updateBuildTargetsStatusBar([]);
            return;
        }
        const currentBuildTargets = this._simplPlusDocuments.GetSimplPlusDocumentBuildTargets(editor.document);
        this.updateBuildTargetsStatusBar(currentBuildTargets);
    };

    private updateBuildTargetsStatusBar(targets: BuildType[]): void {
        if (targets.length === 0) {
            this._statusBar.hide();
            return;
        }
        let buildTasks = "";
        buildTasks = buildTasks.concat(targets.includes("Series2") ? "$(target-two)" : "");
        buildTasks = buildTasks.concat(targets.includes("Series3") ? "$(target-three)" : "");
        buildTasks = buildTasks.concat(targets.includes("Series4") ? "$(target-four)" : "");
        this._statusBar.text = `Targets: ${buildTasks}`;
        this._statusBar.show();
    }

    private async showBuildTargetsQuickPick(currentTypes: BuildType[]): Promise<BuildType[]> {
        const quickPickItems: QuickPickItem[] = [
            { label: "2-Series", description: "Control System Target", picked: currentTypes.includes("Series2") },
            { label: "3-Series", description: "Control System Target", picked: currentTypes.includes("Series3") },
            { label: "4-Series", description: "Control System Target", picked: currentTypes.includes("Series4") }
        ];
        const quickPickOptions: QuickPickOptions = {
            canPickMany: true,
            placeHolder: "Select Compile Target Option"
        };
        const selection = await window.showQuickPick<any>(quickPickItems, quickPickOptions) as QuickPickItem[];
        let buildTypes = [];
        if (selection) {
            selection.some((item) => item.label === "2-Series") ? buildTypes.push("Series2") : null;
            selection.some((item) => item.label === "3-Series") ? buildTypes.push("Series3") : null;;
            selection.some((item) => item.label === "4-Series") ? buildTypes.push("Series4") : null;;
            return buildTypes;
        }
        return undefined;
    }

    public GetDocumentBuildTargets(document: TextDocument | undefined): BuildType[] {
        return this._simplPlusDocuments.GetSimplPlusDocumentBuildTargets(document);
    }
}