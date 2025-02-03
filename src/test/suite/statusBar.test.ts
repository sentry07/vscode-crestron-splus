import * as sinon from "sinon";
import { window, TextDocument, } from 'vscode';
import { OpenAndShowSPlusDocument, removeWorkspaceCustomSettings } from "../testFunctions";
import * as assert from "assert";

suite("Status Bar ", () => {
    let mockDocument: TextDocument;
    const statusBarSpy = sinon.spy(window, "createStatusBarItem");
    setup(() => {
        removeWorkspaceCustomSettings();
    });
    teardown(() => {
        // sinon.resetBehavior();
    });
    test("Should show default build types when opening a new SIMPL Document", async () => {
        await OpenAndShowSPlusDocument("Nothing To See");
        var statusBarItem = statusBarSpy.returnValues[0];
        assert.strictEqual(statusBarItem.text, "Targets: $(target-three)$(target-four)");
        assert.strictEqual(statusBarItem.tooltip, "Click to select SIMPL+ compilation targets");
        assert.strictEqual(statusBarItem.command, "simpl-plus.showQuickPick");
    });
});