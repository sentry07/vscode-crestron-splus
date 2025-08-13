import * as assert from 'assert';
import { removeWorkspaceCustomSettings, OpenAndShowSPlusDocument } from '../testFunctions';
import * as vscode from 'vscode';


suiteSetup(async function () {
  removeWorkspaceCustomSettings();
});
suiteTeardown(async function () {
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
});
suite("Formatting File", function () {
  test("Formatting a dirty file should be the same as the pre-existing formatted file", async () => {
    const currentWorkspace = vscode.workspace.workspaceFolders;
    //@ts-ignore
    const dirtyDocumentPath = vscode.Uri.joinPath(currentWorkspace[0].uri, "dirtyFile.usp");
    //@ts-ignore
    const formattedDocumentPath = vscode.Uri.joinPath(currentWorkspace[0].uri, "formattedFile.usp");
    try {
      const expectedFormattedText = (await vscode.workspace.fs.readFile(formattedDocumentPath)).toLocaleString();

      const dirtyDocument = await vscode.workspace.openTextDocument(dirtyDocumentPath);
      await vscode.window.showTextDocument(dirtyDocument);
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = dirtyDocument.getText();
      assert.strictEqual(newFormattedText, expectedFormattedText);
    }
    catch (error) {
      console.error("Error during testing", error);
    }
  });
});
suite("Formatting Text", function () {
  const formattingTests = [{
    unformattedText: "    //code here",
    expectedFormattedText: "//code here",
    name: "Single Line Comment with leading spaces should remove leading spaces"
  }, {
    unformattedText: "    string_input test; //code here",
    expectedFormattedText: "string_input test; //code here",
    name: "Single Line Comment with text before should be remove leading spaces"
  }, {
    unformattedText: "//code here",
    expectedFormattedText: "//code here",
    name: "Single Line Comment with no spaces should be left alone"
  }, {
    unformattedText: "    /*code here\r\ntext\r  text\r\n  */",
    expectedFormattedText: "/*code here\r\ntext\r\n  text\r\n  */",
    name: "Multi Line Comment with spaces should trim first line spaces"
  }, {
    unformattedText: "   {\r\n  test \r\n  [\r\n  something else \r\n (\r\n )\r\n ]\r\n }",
    expectedFormattedText: "{\r\n\ttest \r\n\t[\r\n\t\t\something else \r\n\t\t(\r\n\t\t)\r\n\t]\r\n}",
    name: "brackets brackets should format into tab indentation and remove leading spaces"
  }, {
    unformattedText: " {\r\n {\r\n  test  }\r\n }",
    expectedFormattedText: "{\r\n\t{\r\n\t\ttest  }\r\n}",
    name: "Closing Bracket with leading test should not decrease indentation"
  },
  {
    unformattedText: " }\r\nTest}\r\n}{\r\n {\r\n  test  }\r\n }",
    expectedFormattedText: "}\r\nTest}\r\n}\r\n{\r\n\t{\r\n\t\ttest  }\r\n}",
    name: "Unmatched closing bracket should not decrease indentation"
  }];
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      assert.strictEqual(newFormattedText, textToFormat.expectedFormattedText);
    });
  });
});
suite("Formatting Input Output Directives", function () {
  const directiveTests = [{
    directive: "digital_input"
  }, {
    directive: "analog_input"
  }, {
    directive: "string_input"
  }, {
    directive: "buffer_input"
  }, {
    directive: "digital_output"
  }, {
    directive: "analog_output"
  }, {
    directive: "string_output"
  }];
  directiveTests.forEach(function (unformattedText) {
    test(`${unformattedText.directive} one line with start spaces, trims spaces`, async () => {
      await OpenAndShowSPlusDocument(`   ${unformattedText.directive} variable1, variable2;`);
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      assert.strictEqual(newFormattedText, `${unformattedText.directive} variable1, variable2;`);
    });
    test(`${unformattedText.directive} multiple line with start spaces, trims spaces, tabs other lines`, async () => {
      const document = await vscode.workspace.openTextDocument({
        language: "simpl-plus",
        content: `   ${unformattedText.directive} variable1,\r\n  variable2;`,
      });
      await vscode.window.showTextDocument(document);
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = document.getText();
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      assert.strictEqual(newFormattedText, `${unformattedText.directive} variable1,\r\n\t\t\t\tvariable2;`);
    });
  });
});






