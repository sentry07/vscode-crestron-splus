import * as vscode from 'vscode';
import { delay } from '../testFunctions';
import { OpenAndShowSPlusDocument } from '../testFunctions';
import * as assert from 'assert';

suite('Help Definitions Tests', () => {
  test('SetArray', async () => {
    await OpenAndShowSPlusDocument("SetArray");
    await delay(500);
    const uri = vscode?.window?.activeTextEditor?.document.uri;
    var hoverInfo = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, new vscode.Position(0, 2));
    //@ts-ignore
    var content = hoverInfo[0].contents[0].value;
    assert.ok(content.includes("SetArray"));
  });
});