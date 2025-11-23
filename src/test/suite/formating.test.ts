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
  test("K_M: Formatting a dirty file should be the same as the pre-existing formatted file", async () => {
    const currentWorkspace = vscode.workspace.workspaceFolders;
    //@ts-ignore
    const dirtyDocumentPath = vscode.Uri.joinPath(currentWorkspace[0].uri, "dirtyFile.usp");
    const dirtyDocument = (await vscode.workspace.fs.readFile(dirtyDocumentPath)).toLocaleString();
    //@ts-ignore
    const formattedDocumentPath = vscode.Uri.joinPath(currentWorkspace[0].uri, "formattedFileK&M.usp");
    const expectedFormattedText = (await vscode.workspace.fs.readFile(formattedDocumentPath)).toLocaleString();
    const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
    await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
    await simplConfig.update("braceLine", false, vscode.ConfigurationTarget.Workspace);
    await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
    await OpenAndShowSPlusDocument(dirtyDocument);
    await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
    await vscode.commands.executeCommand('editor.action.formatDocument');
    const newFormattedText = vscode.window.activeTextEditor?.document.getText();
    assert.strictEqual(newFormattedText, expectedFormattedText);
  });
  test("Allman: Formatting a dirty file should be the same as the pre-existing formatted file", async () => {
    const currentWorkspace = vscode.workspace.workspaceFolders;
    //@ts-ignore
    const dirtyDocumentPath = vscode.Uri.joinPath(currentWorkspace[0].uri, "dirtyFile.usp");
    const dirtyDocument = (await vscode.workspace.fs.readFile(dirtyDocumentPath)).toLocaleString();
    //@ts-ignore
    const formattedDocumentPath = vscode.Uri.joinPath(currentWorkspace[0].uri, "formattedFileAllman.usp");
    const expectedFormattedText = (await vscode.workspace.fs.readFile(formattedDocumentPath)).toLocaleString();
    const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
    await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
    await simplConfig.update("braceLine", true, vscode.ConfigurationTarget.Workspace);
    await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
    await OpenAndShowSPlusDocument(dirtyDocument);
    await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
    await vscode.commands.executeCommand('editor.action.formatDocument');
    const newFormattedText = vscode.window.activeTextEditor?.document.getText();
    assert.strictEqual(newFormattedText, expectedFormattedText);
  });
});
suite("Formatting Comments", function () {
  const formattingTests = [{
    unformattedText: "    //code here",
    expectedFormattedText: "//code here",
    name: "Single Line Comment with leading spaces should remove leading spaces"
  }, {
    unformattedText: "    string_input test;    //code here",
    expectedFormattedText: "STRING_INPUT test; //code here",
    name: "Code line with comment at the end and extra spaces should format accordingly"
  }, {
    unformattedText: "    string_input test;//code here",
    expectedFormattedText: "STRING_INPUT test; //code here",
    name: "Code line with comment at the end and no spaces should format accordingly"
  }, {
    unformattedText: "//code here",
    expectedFormattedText: "//code here",
    name: "Single Line Comment with no spaces should be left alone"
  }, {
    unformattedText: "    /*code here\r\ntext { open Curly Bracket\r\n  text\r\n  */",
    expectedFormattedText: "/*code here\r\ntext { open Curly Bracket\r\n  text\r\n  */",
    name: "Multi Line Comment with curly brackets should not indent curly brackets"
  }, {
    unformattedText: "{ test; //comment\r\n}",
    expectedFormattedText: "{\r\n\ttest; //comment\r\n}",
    name: "Single Line Comment after semicolon, stays at end of line"
  }, {
    unformattedText: "{ test; \r\n{//comment\r\n test; } }",
    expectedFormattedText: "{\r\n\ttest;\r\n\t{ //comment\r\n\t\ttest;\r\n\t}\r\n}",
    name: "Single Line Comment after Open curly brackets, stays with open curly bracket"
  }, {
    unformattedText: "{ test; \r\n{ test; }//comment\r\n }",
    expectedFormattedText: "{\r\n\ttest;\r\n\t{\r\n\t\ttest;\r\n\t} //comment\r\n}",
    name: "Single Line Comment after Close curly brackets, stays with open curly bracket"
  },
  {
    unformattedText: "{\r\nstatement1;   //test\r\n/* test block 1\r\n    test block 2\r\n*/\r\n}",
    expectedFormattedText: "{\r\n\tstatement1; //test\r\n/* test block 1\r\n    test block 2\r\n*/\r\n}",
    name: "Inline Comment before bock comment"
  },
  {
    unformattedText: "{\r\nstatement1   //test\r\nstatement;\r\n}",
    expectedFormattedText: "{\r\n\tstatement1 //test\r\nstatement;\r\n}",
    name: "Malformed Inline Comment before statements"
  },
  {
    unformattedText: "{\r\nstatement1\r\nstatement\r\n}",
    expectedFormattedText: "{\r\n\tstatement1 statement\r\n}",
    name: "Malformed statements with no semicolon"
  },
  {
    unformattedText: "{\r\n//test\r\n}",
    expectedFormattedText: "{\r\n\t//test\r\n}",
    name: "Single Line Comment before brace"
  },
  {
    unformattedText: "{\r\n/* test block 1\r\n    test block 2\r\n*/\r\n}",
    expectedFormattedText: "{\r\n/* test block 1\r\n    test block 2\r\n*/\r\n}",
    name: "Block Comment before brace"
  },
  {
    unformattedText: "{\r\n//test\r\n/* test block 1\r\n    test block 2\r\n*/}",
    expectedFormattedText: "{\r\n\t//test\r\n/* test block 1\r\n    test block 2\r\n*/\r\n}",
    name: "Single Line Comment followed by block comment"
  },
  {
    unformattedText: "{\r\nstatement1;   //test\r\nstatement2;}",
    expectedFormattedText: "{\r\n\tstatement1; //test\r\n\tstatement2;\r\n}",
    name: "Inline Comment between statements"
  },
  {
    unformattedText: "{\r\nstatement1;\r\n//test\r\nstatement2;}",
    expectedFormattedText: "{\r\n\tstatement1;\r\n\t//test\r\n\tstatement2;\r\n}",
    name: "Single Line Comment before brace between statements"
  },
  {
    unformattedText: "{\r\nstatement1;\r\n/* test block 1\r\n    test block 2\r\n*/\r\nstatement2;}",
    expectedFormattedText: "{\r\n\tstatement1;\r\n/* test block 1\r\n    test block 2\r\n*/\r\n\tstatement2;\r\n}",
    name: "Block Comment before brace between statements"
  },
  {
    unformattedText: "{\r\nstatement1;\r\n//test\r\n/* test block 1\r\n    test block 2\r\n*/\r\nstatement2;}",
    expectedFormattedText: "{\r\n\tstatement1;\r\n\t//test\r\n/* test block 1\r\n    test block 2\r\n*/\r\n\tstatement2;\r\n}",
    name: "Single Line Comment followed by block comment between statements"
  }]
    ;
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("braceLine", false, vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      assert.strictEqual(newFormattedText, textToFormat.expectedFormattedText);
    });
  });
});
suite("Formatting Text New line before curly bracket (allman style) with tabs", function () {
  const formattingTests = [{
    unformattedText: " test {\r\n test {\r\n  test; { test; }  }\r\n }",
    expectedFormattedText: "test\r\n{\r\n\ttest\r\n\t{\r\n\t\ttest;\r\n\t\t{\r\n\t\t\ttest;\r\n\t\t}\r\n\t}\r\n}",
    name: "basic nested brackets should format into tab indentation"
  },
  {
    unformattedText: "{do { something; }\r\n until\r\n (condition);statement;}",
    expectedFormattedText: "{\r\n\tDO\r\n\t{\r\n\t\tsomething;\r\n\t} UNTIL (condition);\r\n\tstatement;\r\n}",
    name: "formatting do until "
  },
  {
    unformattedText: "FUNCTION FUNCTION() //test 2\r\n{\r\n	if (something = funct() )  // test 1\r\n	if (smothing =funct() )   // test 3\r\n	For (INTEGER_VARIABLE = VALUE_A To VALUE_B)    // test 3\r\n	something;\r\n	else something;\r\n }    //test 2F",
    expectedFormattedText: "FUNCTION FUNCTION() //test 2\r\n{\r\n	IF (something = funct()) // test 1\r\n		IF (smothing = funct()) // test 3\r\n			FOR (INTEGER_VARIABLE = VALUE_A TO VALUE_B) // test 3\r\n				something;\r\n\tELSE\r\n\t\tsomething;\r\n} //test 2F",
    name: "formatting several one line statements with comments "
  },
  {
    unformattedText: "FUNCTION FUNCTION()     //test 2\r\n{\r\nSWITCH (POLL_F)     //test 2\r\n{\r\nCASE (1):    //next capture\r\n{\r\nsomething     //test 2\r\n}\r\n}     //test 2\r\n}     //test 2F",
    expectedFormattedText: "FUNCTION FUNCTION() //test 2\r\n{\r\n	SWITCH (POLL_F) //test 2\r\n	{\r\n		CASE (1): //next capture\r\n		{\r\n			something //test 2\r\n		}\r\n	} //test 2\r\n} //test 2F",
    name: "Inline comments at the end of line with open and close brace should be preserved"
  },
  {
    unformattedText: "Structure test { something; };",
    expectedFormattedText: "STRUCTURE test\r\n{\r\n\tsomething;\r\n};",
    name: "Structures should keep semicolon after closing brace"
  },
  {
    unformattedText: "FUNCTION FUNCTION() { //test 2\r\nSWITCH (POLL_F) { //test 2\r\nCASE (1): { //next capture\r\n	something     //test 2\r\n}\r\n}     //test 2\r\n}     //test 2F",
    expectedFormattedText: "FUNCTION FUNCTION() //test 2\r\n{\r\n	SWITCH (POLL_F) //test 2\r\n	{\r\n		CASE (1): //next capture\r\n		{\r\n			something //test 2\r\n		}\r\n	} //test 2\r\n} //test 2F",
    name: "K&M to Allman and Inline comments at the end of line with open and close brace should be preserved"
  }];
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      console.log(`>>>>>>>>>>>>------${textToFormat.name}-----------<<<<<<<<<<<<<<<`);
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("braceLine", true, vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      assert.strictEqual(newFormattedText, textToFormat.expectedFormattedText);
    });
  });
});
suite("Formatting Text New line before curly bracket (allman style) with 2 spaces", function () {
  const formattingTests = [{
    unformattedText: " test {\r\n test {\r\n  test; { test; }  }\r\n }",
    expectedFormattedText: "test\r\n{\r\n  test\r\n  {\r\n    test;\r\n    {\r\n      test;\r\n    }\r\n  }\r\n}",
    name: "basic nested brackets should format into 2 spaces indentation"
  },
  {
    unformattedText: "do { something; } until (condition);",
    expectedFormattedText: "DO\r\n{\r\n  something;\r\n} UNTIL (condition);",
    name: "formatting do until "
  },
  {
    unformattedText: "FUNCTION FUNCTION() //test 2\r\n{\r\n	if (something = funct() )  // test 1\r\n	if (smothing = funct() )   // test 3\r\n	For (INTEGER_VARIABLE = VALUE_A To VALUE_B)    // test 3\r\n	something;\r\n	else something;\r\n }    //test 2F",
    expectedFormattedText: "FUNCTION FUNCTION() //test 2\r\n{\r\n  IF (something = funct()) // test 1\r\n    IF (smothing = funct()) // test 3\r\n      FOR (INTEGER_VARIABLE = VALUE_A TO VALUE_B) // test 3\r\n        something;\r\n  ELSE\r\n    something;\r\n} //test 2F",
    name: "formatting several one line statements with comments "
  }];
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("insertSpaces", true, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("indentSize", 2, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("braceLine", true, vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      assert.strictEqual(newFormattedText, textToFormat.expectedFormattedText);
    });
  });
});
suite("Formatting Text Same line before curly bracket (K&R style)", function () {
  const formattingTests = [{
    unformattedText: " test      {\r\n     test     {\r\n      test;     {     test;    }      }\r\n }",
    expectedFormattedText: "test \{\r\n\ttest {\r\n\t\ttest;\r\n\t\t{\r\n\t\t\ttest;\r\n\t\t}\r\n\t}\r\n}",
    name: "basic nested brackets should format into tab indentation"
  },
  {
    unformattedText: "do { something; } until (condition);",
    expectedFormattedText: "DO {\r\n\tsomething;\r\n} UNTIL (condition);",
    name: "formatting do until "
  },
  {
    unformattedText: "FUNCTION FUNCTION() { //test 2\r\nSWITCH (POLL_F) { //test 2\r\nCASE (1): { //next capture\r\n	something     //test 2\r\n}\r\n}     //test 2\r\n}     //test 2F",
    expectedFormattedText: "FUNCTION FUNCTION() { //test 2\r\n	SWITCH (POLL_F) { //test 2\r\n		CASE (1): { //next capture\r\n			something //test 2\r\n		}\r\n	} //test 2\r\n} //test 2F",
    name: "Inline comments at the end of line with open and close brace should be preserved"
  },
  {
    unformattedText: "Structure test { something; };",
    expectedFormattedText: "STRUCTURE test {\r\n\tsomething;\r\n};",
    name: "Structures should keep semicolon after closing brace"
  },
  {
    unformattedText: "FUNCTION FUNCTION()     //test 2\r\n{\r\nSWITCH (POLL_F)     //test 2\r\n{\r\nCASE (1):    //next capture\r\n{\r\nsomething     //test 2\r\n}\r\n}     //test 2\r\n}     //test 2F",
    expectedFormattedText: "FUNCTION FUNCTION() { //test 2\r\n	SWITCH (POLL_F) { //test 2\r\n		CASE (1): { //next capture\r\n			something //test 2\r\n		}\r\n	} //test 2\r\n} //test 2F",
    name: "Allman to K&R switch and with Inline comments at the end of line with open and close brace should be preserved"
  }];
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("braceLine", false, vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      assert.strictEqual(newFormattedText, textToFormat.expectedFormattedText);
    });
  });
});
suite("Formatting Directives", function () {
  const formattingTests = [{
    unformattedText: "#enable_trace\r\n#category \"something\" //test",
    expectedFormattedText: "#ENABLE_TRACE\r\n#CATEGORY \"something\" //test",
    name: "Directives Case is always Uppercase"
  },
  {
    unformattedText: "  #help_begin\r\n    something something\r\n\tsomething something\r\n    #help_end",
    expectedFormattedText: "#HELP_BEGIN\r\n    something something\r\n\tsomething something\r\n#HELP_END",
    name: "Help Block leaves internal content unformatted and removes leading spaces of directives"
  },
  {
    unformattedText: "  #begin_prop_full_description\r\nsomething something\r\n\tsomething something\r\n    #end_prop_full_description",
    expectedFormattedText: "#BEGIN_PROP_FULL_DESCRIPTION\r\nsomething something\r\n\tsomething something\r\n#END_PROP_FULL_DESCRIPTION",
    name: "Begin Prop Full Description Block leaves internal content unformatted and removes leading spaces of directives"
  },
  {
    unformattedText: "  #begin_prop_notes\r\nsomething something\r\n\tsomething something\r\n    #end_prop_notes",
    expectedFormattedText: "#BEGIN_PROP_NOTES\r\nsomething something\r\n\tsomething something\r\n#END_PROP_NOTES",
    name: "Begin Prop Notes Block leaves internal content unformatted and removes leading spaces of directives"
  },
  ];
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "lowercase", vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("braceLine", false, vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      assert.strictEqual(newFormattedText, textToFormat.expectedFormattedText);
    });
  });
});
suite("One statement expressions", function () {
  const formattingTests = [{
    unformattedText: "{if (condition = fn()) something;}",
    expectedFormattedText: "{\r\n\tIF (condition = fn())\r\n\t\tsomething;\r\n}",
    name: "If statement"
  },
  {
    unformattedText: "{if (condition = fn()) something; else somethingElse;}",
    expectedFormattedText: "{\r\n\tIF (condition = fn())\r\n\t\tsomething;\r\n\tELSE\r\n\t\tsomethingElse;\r\n}",
    name: "If else statement"
  },
  {
    unformattedText: "{if (condition = fn()) something; else if (condition = fn2()) else somethingElse;}",
    expectedFormattedText: "{\r\n\tIF (condition = fn())\r\n\t\tsomething;\r\n\tELSE IF (condition = fn2())\r\n\t\tELSE\r\n\t\t\tsomethingElse;\r\n}",
    name: "If else if else statement"
  },
  {
    unformattedText: "{for (condition = fn() to fn2() step fn3()) something;}",
    expectedFormattedText: "{\r\n\tFOR (condition = fn() TO fn2() STEP fn3())\r\n\t\tsomething;\r\n}",
    name: "For statement"
  },
  {
    unformattedText: "{while (condition = fn() ) something;}",
    expectedFormattedText: "{\r\n\tWHILE (condition = fn())\r\n\t\tsomething;\r\n}",
    name: "While statement"
  },
  {
    unformattedText: "{wait (condition = fn() ) something;}",
    expectedFormattedText: "{\r\n\tWAIT (condition = fn())\r\n\t\tsomething;\r\n}",
    name: "Wait statement"
  },
  {
    unformattedText: "{switch (variable){case (expression)   : something;default: somethingElse;} }",
    expectedFormattedText: "{\r\n\tSWITCH (variable)\r\n\t{\r\n\t\tCASE (expression) :\r\n\t\t\tsomething;\r\n\t\tDEFAULT:\r\n\t\t\tsomethingElse;\r\n\t}\r\n}",
    name: "Switch statement"
  },
  {
    unformattedText: "{switch (variable){case (expression)    something;default: somethingElse;} }",
    expectedFormattedText: "{\r\n\tSWITCH (variable)\r\n\t{\r\n\t\tCASE (expression) something;\r\n\t\tDEFAULT:\r\n\t\t\tsomethingElse;\r\n\t}\r\n}",
    name: "malformed Case statement should not end in stack error"
  },
  {
    unformattedText: "{switch (variable){case (expression)   : something;default    somethingElse;} }",
    expectedFormattedText: "{\r\n\tSWITCH (variable)\r\n\t{\r\n\t\tCASE (expression) :\r\n\t\t\tsomething;\r\n\t\tDEFAULT somethingElse;\r\n\t}\r\n}",
    name: "malformed Default statement should not end in stack error"
  },
  {
    unformattedText: "{switch (variable){case (expression)   : if (condition) for (loopCondition) wait (tm) while (condition) something;default: somethingElse;} }",
    expectedFormattedText: "{\r\n\tSWITCH (variable)\r\n\t{\r\n\t\tCASE (expression) :\r\n\t\t\tIF (condition)\r\n\t\t\t\tFOR (loopCondition)\r\n\t\t\t\t\tWAIT (tm)\r\n\t\t\t\t\t\tWHILE (condition)\r\n\t\t\t\t\t\t\tsomething;\r\n\t\tDEFAULT:\r\n\t\t\tsomethingElse;\r\n\t}\r\n}",
    name: "Mixed statement"
  },
  {
    unformattedText: "{switch (variable){case (expression)   : \r\nif (condition) \r\nfor (loopCondition) \r\nwait (tm) \r\nwhile (condition) \r\nsomething;\r\ndefault: \r\nsomethingElse;\r\n} }",
    expectedFormattedText: "{\r\n\tSWITCH (variable)\r\n\t{\r\n\t\tCASE (expression) :\r\n\t\t\tIF (condition)\r\n\t\t\t\tFOR (loopCondition)\r\n\t\t\t\t\tWAIT (tm)\r\n\t\t\t\t\t\tWHILE (condition)\r\n\t\t\t\t\t\t\tsomething;\r\n\t\tDEFAULT:\r\n\t\t\tsomethingElse;\r\n\t}\r\n}",
    name: "Mixed statement with new lines"
  },
  ];
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("braceLine", true, vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      assert.strictEqual(newFormattedText, textToFormat.expectedFormattedText);
    });
  });
});
suite("One statement expressions with inline comments", function () {
  const formattingTests = [{
    unformattedText: "{if (condition = fn())    //test\r\n something;   //test\r\n}",
    expectedFormattedText: "{\r\n\tIF (condition = fn()) //test\r\n\t\tsomething; //test\r\n}",
    name: "If statement"
  },
  {
    unformattedText: "{if (condition = fn())    //test\r\nif (condition = fn())    //test\r\n something;   //test\r\n}",
    expectedFormattedText: "{\r\n\tIF (condition = fn()) //test\r\n\t\tIF (condition = fn()) //test\r\n\t\t\tsomething; //test\r\n}",
    name: "Nested If statement"
  },
  {
    unformattedText: "{if (condition = fn())    //test1\r\n something;    //test2\r\n else    //test3\r\n somethingElse;    //test4\r\n}",
    expectedFormattedText: "{\r\n\tIF (condition = fn()) //test1\r\n\t\tsomething; //test2\r\n\tELSE //test3\r\n\t\tsomethingElse; //test4\r\n}",
    name: "If else statement"
  },
  {
    unformattedText: "{if (condition = fn())    //test\r\n something;    //test\r\n else if (condition = fn2())    //test\r\n else    //test\r\n somethingElse;    //test\r\n}",
    expectedFormattedText: "{\r\n\tIF (condition = fn()) //test\r\n\t\tsomething; //test\r\n\tELSE IF (condition = fn2()) //test\r\n\t\tELSE //test\r\n\t\t\tsomethingElse; //test\r\n}",
    name: "If else if else statement"
  },
  {
    unformattedText: "{for (condition = fn() to fn2() step fn3())    //test\r\n something;    //test\r\n}",
    expectedFormattedText: "{\r\n\tFOR (condition = fn() TO fn2() STEP fn3()) //test\r\n\t\tsomething; //test\r\n}",
    name: "For statement"
  },
  {
    unformattedText: "{while (condition = fn() )    //test\r\n something;    //test\r\n}",
    expectedFormattedText: "{\r\n\tWHILE (condition = fn()) //test\r\n\t\tsomething; //test\r\n}",
    name: "While statement"
  },
  {
    unformattedText: "{wait (condition = fn() )    //test\r\n something;    //test\r\n}",
    expectedFormattedText: "{\r\n\tWAIT (condition = fn()) //test\r\n\t\tsomething; //test\r\n}",
    name: "Wait statement"
  },
  {
    unformattedText: "{switch (variable){case (expression)   :     //test\r\nsomething;    //test\r\ndefault:     //test\r\nsomethingElse;    //test\r\n} }",
    expectedFormattedText: "{\r\n\tSWITCH (variable)\r\n\t{\r\n\t\tCASE (expression) : //test\r\n\t\t\tsomething; //test\r\n\t\tDEFAULT: //test\r\n\t\t\tsomethingElse; //test\r\n\t}\r\n}",
    name: "Switch statement"
  },
  {
    unformattedText: "{switch (variable){case (expression)   :     //test1\r\n if (condition) //test2\r\nfor (loopCondition)     //test3\r\n wait (tm)     //test4\r\n while (condition)     //test5\r\n something;     //test6\r\ndefault:     //test7\r\n somethingElse;    //test8\r\n} }",
    expectedFormattedText: "{\r\n\tSWITCH (variable)\r\n\t{\r\n\t\tCASE (expression) : //test1\r\n\t\t\tIF (condition) //test2\r\n\t\t\t\tFOR (loopCondition) //test3\r\n\t\t\t\t\tWAIT (tm) //test4\r\n\t\t\t\t\t\tWHILE (condition) //test5\r\n\t\t\t\t\t\t\tsomething; //test6\r\n\t\tDEFAULT: //test7\r\n\t\t\tsomethingElse; //test8\r\n\t}\r\n}",
    name: "Mixed statement"
  },
  {
    unformattedText: "{\r\niFind = FindNoCase (\"Slot:\", FileDat$);\r\n}",
    expectedFormattedText: "{\r\n\tiFind = FINDNOCASE (\"Slot:\", FileDat$);\r\n}",
    name: "Functions with keywords 1"
  },
  {
    unformattedText: "{\r\niFind = DefaultFunction ();\r\n}",
    expectedFormattedText: "{\r\n\tiFind = DefaultFunction ();\r\n}",
    name: "Functions with keywords 2"
  },
  ];
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("braceLine", true, vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      assert.strictEqual(newFormattedText, textToFormat.expectedFormattedText);
    });
  });
});
suite("Formatting expressions", function () {
  const formattingTests = [{
    unformattedText: " a=b;",
    expectedFormattedText: "a = b;",
    name: "basic assignment should format with spaces around equal sign"
  },
  {
    unformattedText: " A<>B; A<=B; A>=B; A<B; A>B; AS<B; AS<=B; AS>B; AS>=B; As<B; As<=B; As>B; As>=B; A!=B; not(a);",
    expectedFormattedText: "A <> B;\r\nA <= B;\r\nA >= B;\r\nA < B;\r\nA > B;\r\nA S< B;\r\nA S<= B;\r\nA S> B;\r\nA S>= B;\r\nA s< B;\r\nA s<= B;\r\nA s> B;\r\nA s>= B;\r\nA != B;\r\nNOT(a);",
    name: "comparison operators should format with spaces around operator"
  },
  {
    unformattedText: " a<<b; a>>b; a{{b; a}}b; a&b; a|b; a^b;",
    expectedFormattedText: "a << b;\r\na >> b;\r\na {{ b;\r\na }} b;\r\na & b;\r\na | b;\r\na ^ b;",
    name: "bitwise operators should format with spaces around operator"
  },
  {
    unformattedText: " a&&b; a||b;",
    expectedFormattedText: "a && b;\r\na || b;",
    name: "logical operators should format with spaces around operator"
  },
  {
    unformattedText: " a+b; a-b; a*b; a/b; a%b; a    mod    b; a    umod   b;",
    expectedFormattedText: "a + b;\r\na - b;\r\na * b;\r\na / b;\r\na % b;\r\na mod b;\r\na umod b;",
    name: "arithmetic operators should format with spaces around operator"
  },
  {
    unformattedText: "[ 1 ] ( 3 ); ( 1 ); [ a , 2];",
    expectedFormattedText: "[1] (3);\r\n(1);\r\n[a, 2];",
    name: "bracket and parenthesis should remove extra spacing"
  },];
  formattingTests.forEach(function (textToFormat) {
    test(textToFormat.name, async () => {
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "UPPERCASE", vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("insertSpaces", false, vscode.ConfigurationTarget.Workspace);
      await simplConfig.update("braceLine", false, vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(textToFormat.unformattedText);
      await vscode.commands.executeCommand('editor.action.formatDocument');// run twice to ensure idempotency
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
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "Unchanged", vscode.ConfigurationTarget.Workspace);
      await OpenAndShowSPlusDocument(`   ${unformattedText.directive} variable1, variable2;`);
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = vscode.window.activeTextEditor?.document.getText();
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      assert.strictEqual(newFormattedText, `${unformattedText.directive} variable1, variable2;`);
    });
    test(`${unformattedText.directive} multiple line with start spaces, trims spaces`, async () => {
      const document = await vscode.workspace.openTextDocument({
        language: "crestron-splus",
        content: `   ${unformattedText.directive} variable1,\r\n\t variable2;`,
      });
      await vscode.window.showTextDocument(document);
      const simplConfig = vscode.workspace.getConfiguration("crestron-splus");
      await simplConfig.update("keywordCase", "Unchanged", vscode.ConfigurationTarget.Workspace);
      await vscode.commands.executeCommand('editor.action.formatDocument');
      const newFormattedText = document.getText();
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      assert.strictEqual(newFormattedText, `${unformattedText.directive} variable1, variable2;`);
    });
  });
});






