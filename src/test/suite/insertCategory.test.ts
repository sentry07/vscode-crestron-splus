import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { delay, OpenAndShowSPlusDocument } from '../testFunctions';

suite('Insert Category Command Test Suite', () => {

    let showQuickPickStub: sinon.SinonStub;


    setup(() => {
        showQuickPickStub = sinon.stub(vscode.window, 'showQuickPick');
    });

    teardown(() => {
        sinon.restore();
    });

    test('should insert category when input is provided', async () => {
        const quickPickItem: vscode.QuickPickItem =
        {
            label: "6",
            description: "Lighting",
        };
        showQuickPickStub.resolves(quickPickItem);
        await OpenAndShowSPlusDocument("\/\/Nothing To See");
        await vscode.commands.executeCommand('crestron-splus.insertCategory');
        await delay(200);
        const text = vscode.window.activeTextEditor?.document.getText();
        if (text === undefined) { assert.fail; }
        assert.match(text!, /#Category "6" \/\/Lighting\r\n\/\/Nothing To See/);
    });

    test('should insert custom category when input is provided', async () => {
        const quickPickItem: vscode.QuickPickItem =
        {
            label: "46",
            description: "Custom",
        };
        showQuickPickStub.resolves(quickPickItem);
        const showInputBoxStub = sinon.stub(vscode.window, 'showInputBox').resolves("My Test Category");

        await OpenAndShowSPlusDocument("\/\/Nothing To See");
        await vscode.commands.executeCommand('crestron-splus.insertCategory');
        await delay(200);
        const text = vscode.window.activeTextEditor?.document.getText();
        if (text === undefined) { assert.fail; }
        assert.match(text!, /#Category "46" "My Test Category" \/\/Custom\r\n\/\/Nothing To See/);
    });

    test('should not insert category when input is cancelled', async () => {
        showQuickPickStub.resolves(undefined);

        await OpenAndShowSPlusDocument("\/\/Nothing To See");
        await vscode.commands.executeCommand('crestron-splus.insertCategory');

        const text = vscode.window.activeTextEditor?.document.getText();
        if (text === undefined) { assert.fail; }
        assert.doesNotMatch(text!, /#Category "6"/);
    });
});