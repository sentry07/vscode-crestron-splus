import * as assert from 'assert';
import * as sinon from "sinon";
import { removeWorkspaceCustomSettings, OpenAndShowSPlusDocument } from '../testFunctions';
import * as vscode from 'vscode';

suiteTeardown(async function () {
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
});
suite("With No Saved File and inside the workfolder with usps", function () {
    test("It should return 7 tasks", async () => {
        await OpenAndShowSPlusDocument("\/\/Nothing To See");
        const splusTasks = await vscode.tasks.fetchTasks();
        assert.strictEqual(splusTasks.length, 7);
    });
});
suite("With Faked Saved File", function () {
    suiteSetup(function () {
        sinon.stub(vscode.workspace, "getWorkspaceFolder").callsFake(() => {
            const fakeUri = vscode.Uri.parse("file:///some/folder");
            const fakeWorkspaceFolder = { uri: fakeUri, index: 0, name: "fakeFolder" } as vscode.WorkspaceFolder;
            return fakeWorkspaceFolder;
        });
    });
    suite("With Default Settings", function () {
        test("It should have Compile 3 Series and 4 Task", async () => {
            await OpenAndShowSPlusDocument("\/\/Nothing To See");
            const splusTasks = await vscode.tasks.fetchTasks();
            assert.strictEqual(splusTasks.length, 7);
            assert.strictEqual(splusTasks[0].name, "Compile 2 & 3 & 4 Series");
            assert.strictEqual(splusTasks[1].name, "Compile 2 & 3 Series");
            assert.strictEqual(splusTasks[2].name, "Compile 2 & 4 Series");
            assert.strictEqual(splusTasks[3].name, "Compile 2 Series");
            assert.strictEqual(splusTasks[4].name, "Compile 3 & 4 Series");
            assert.strictEqual(splusTasks[5].name, "Compile 3 Series");
            assert.strictEqual(splusTasks[6].name, "Compile 4 Series");
        });
    });
});