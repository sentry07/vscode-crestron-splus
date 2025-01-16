import * as assert from 'assert';
import { removeWorkspaceCustomSettings, OpenAndShowSPlusDocument, delay } from '../testFunctions';
import * as vscode from 'vscode';
import { SimplPlusParser } from '../../helpers/simplPlusParser';


suite("testing document tokenization", function () {
    suiteSetup(async function () {
        await removeWorkspaceCustomSettings();
    });

    suiteTeardown(async function () {
        await removeWorkspaceCustomSettings();

    });
    test("It should have a constant", async () => {
        await OpenAndShowSPlusDocument("#DEFINE_CONSTANT MYCONSTANT 32");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "MYCONSTANT");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Constant);
        assert.strictEqual(documentMembers[0].dataType, "integer");
        assert.strictEqual(documentMembers[0].children.length, 0);
        assert.strictEqual(documentMembers[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 17);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 27);
    });
    test("It should have a global variable with an input type modifier", async () => {
        await OpenAndShowSPlusDocument("BUFFER_INPUT BufferInput1[20];");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "BufferInput1");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].dataType, "BUFFER_INPUT");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "INPUT");
        assert.strictEqual(documentMembers[0].children.length, 0);
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 13);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 25);
    });
    test("It should have a global variable with an output type modifier", async () => {
        await OpenAndShowSPlusDocument("ANALOG_OUTPUT AnalogOutput1[20];");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "AnalogOutput1");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].dataType, "ANALOG_OUTPUT");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "OUTPUT");
        assert.strictEqual(documentMembers[0].children.length, 0);
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 14);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 27);
    });
    test("It should have a global variable with an parameter type modifier", async () => {
        await OpenAndShowSPlusDocument("INTEGER_PARAMETER IntegerParameter;");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "IntegerParameter");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].dataType, "INTEGER_PARAMETER");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "PARAMETER");
        assert.strictEqual(documentMembers[0].children.length, 0);
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 18);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 34);
    });
    
    test("It should have a global variable with a custom type", async () => {
        await OpenAndShowSPlusDocument("myType myVariableOfType;");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "myVariableOfType");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].dataType, "myType");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].children.length, 0);
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 7);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 23);
    });
    test("It should have a CMutex global variable with a builtIn modifier type", async () => {
        await OpenAndShowSPlusDocument("CMutex myVariableOfType;");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "myVariableOfType");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].dataType, "CMutex");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "BuiltIn");
        assert.strictEqual(documentMembers[0].children.length, 0);
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 7);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 23);
    });
    test("It should have a global variable with a custom type and a modifier", async () => {
        await OpenAndShowSPlusDocument("INHERIT myType myVariableOfType;");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "myVariableOfType");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].dataType, "myType");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "INHERIT");
        assert.strictEqual(documentMembers[0].children.length, 0);
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 15);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 31);
    });
    test("It should have a structure with an inside variable", async () => {
        await OpenAndShowSPlusDocument("STRUCTURE testStructure\n{\nstring STRING1[20];\n};");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "testStructure");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Struct);
        assert.strictEqual(documentMembers[0].dataType, "testStructure");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 10);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 23);
        assert.strictEqual(documentMembers[0].blockRange.start.line, 1);
        assert.strictEqual(documentMembers[0].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[0].blockRange.end.line, 3);
        assert.strictEqual(documentMembers[0].blockRange.end.character, 1);

        assert.strictEqual(documentMembers[0].children.length, 1);
        assert.strictEqual(documentMembers[0].children[0].name, "STRING1");
        assert.strictEqual(documentMembers[0].children[0].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].children[0].dataType, "string");
        assert.strictEqual(documentMembers[0].children[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].children[0].parent.name, "testStructure");
        assert.strictEqual(documentMembers[0].children[0].uri, documentName);
        assert.strictEqual(documentMembers[0].children[0].nameRange.start.line, 2);
        assert.strictEqual(documentMembers[0].children[0].nameRange.start.character, 7);
        assert.strictEqual(documentMembers[0].children[0].nameRange.end.line, 2);
        assert.strictEqual(documentMembers[0].children[0].nameRange.end.character, 14);
    });
    test("It should have a function with an inside variable and one parameter", async () => {
        await OpenAndShowSPlusDocument("INTEGER_FUNCTION testFunction(integer testParam)\n{\nstring STRING1[20];\n};");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "testFunction");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Function);
        assert.strictEqual(documentMembers[0].dataType, "INTEGER");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 17);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 29);
        assert.strictEqual(documentMembers[0].blockRange.start.line, 1);
        assert.strictEqual(documentMembers[0].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[0].blockRange.end.line, 3);
        assert.strictEqual(documentMembers[0].blockRange.end.character, 1);

        assert.strictEqual(documentMembers[0].children.length, 2);
        assert.strictEqual(documentMembers[0].children[0].name, "testParam");
        assert.strictEqual(documentMembers[0].children[0].kind, vscode.CompletionItemKind.TypeParameter);
        assert.strictEqual(documentMembers[0].children[0].dataType, "integer");
        assert.strictEqual(documentMembers[0].children[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].children[0].uri, documentName);
        assert.strictEqual(documentMembers[0].children[0].parent.name, "testFunction");
        assert.strictEqual(documentMembers[0].children[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].children[0].nameRange.start.character, 38);
        assert.strictEqual(documentMembers[0].children[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].children[0].nameRange.end.character, 47);
        assert.strictEqual(documentMembers[0].children[0].blockRange.start.line, 0);
        assert.strictEqual(documentMembers[0].children[0].blockRange.start.character, 29);
        assert.strictEqual(documentMembers[0].children[0].blockRange.end.line, 0);
        assert.strictEqual(documentMembers[0].children[0].blockRange.end.character, 48);

        assert.strictEqual(documentMembers[0].children[1].name, "STRING1");
        assert.strictEqual(documentMembers[0].children[1].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].children[1].dataType, "string");
        assert.strictEqual(documentMembers[0].children[1].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].children[1].uri, documentName);
        assert.strictEqual(documentMembers[0].children[1].parent.name, "testFunction");
        assert.strictEqual(documentMembers[0].children[1].nameRange.start.line, 2);
        assert.strictEqual(documentMembers[0].children[1].nameRange.start.character, 7);
        assert.strictEqual(documentMembers[0].children[1].nameRange.end.line, 2);
        assert.strictEqual(documentMembers[0].children[1].nameRange.end.character, 14);
    });

    test("It should have a function with an callback modifier and no parameters or elements", async () => {
        await OpenAndShowSPlusDocument("callback INTEGER_FUNCTION testFunction()\n{\n};");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "testFunction");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Function);
        assert.strictEqual(documentMembers[0].dataType, "INTEGER");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "callback");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 26);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 38);
        assert.strictEqual(documentMembers[0].blockRange.start.line, 1);
        assert.strictEqual(documentMembers[0].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[0].blockRange.end.line, 2);
        assert.strictEqual(documentMembers[0].blockRange.end.character, 1);
        assert.strictEqual(documentMembers[0].children.length, 0);
    });

    test("It should have a function with a void data type", async () => {
        await OpenAndShowSPlusDocument("FUNCTION testFunction()\n{\n};");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "testFunction");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Function);
        assert.strictEqual(documentMembers[0].dataType, "void");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 9);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 21);
        assert.strictEqual(documentMembers[0].blockRange.start.line, 1);
        assert.strictEqual(documentMembers[0].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[0].blockRange.end.line, 2);
        assert.strictEqual(documentMembers[0].blockRange.end.character, 1);
        assert.strictEqual(documentMembers[0].children.length, 0);
    });

    test("It should have a function with an eventHandler modifier and no parameters or elements", async () => {
        await OpenAndShowSPlusDocument("eventHandler testFunction()\n{\n};");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "testFunction");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Function);
        assert.strictEqual(documentMembers[0].dataType, "void");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "eventHandler");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 13);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 25);
        assert.strictEqual(documentMembers[0].blockRange.start.line, 1);
        assert.strictEqual(documentMembers[0].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[0].blockRange.end.line, 2);
        assert.strictEqual(documentMembers[0].blockRange.end.character, 1);
        assert.strictEqual(documentMembers[0].children.length, 0);
    });

    // test("test that position is inside parameters", async () => {
    //     await OpenAndShowSPlusDocument("INTEGER_FUNCTION testFunction(integer testParam)\n{\nBUFFER_INPUT BufferInput1[20];\n};");
    //     await delay(50);
    //     const mockExtensionContext = (global as any).testExtensionContext;
    //     const documentTokenService = DocumentTokenService.getInstance(mockExtensionContext);
    //     const position = new vscode.Position(0, 32);
    //     const isInsideParameter = documentTokenService.isAtParameterRange(vscode.window.activeTextEditor?.document.uri, position);
    //     assert.ok(isInsideParameter);
    // });

    // test("test that position is not inside parameters", async () => {
    //     await OpenAndShowSPlusDocument("INTEGER_FUNCTION testFunction(integer testParam)\n{\nBUFFER_INPUT BufferInput1[20];\n};");
    //     await delay(50);
    //     const mockExtensionContext = (global as any).testExtensionContext;
    //     const documentTokenService = DocumentTokenService.getInstance(mockExtensionContext);
    //     const position = new vscode.Position(2, 2);
    //     const isInsideParameter = documentTokenService.isAtParameterRange(vscode.window.activeTextEditor?.document.uri, position);
    //     assert.ok(!isInsideParameter);
    // });


    test("It should have an event push with an inside variable", async () => {
        await OpenAndShowSPlusDocument("push DigitalInput1\n{\nstring STRING1[20];\n};");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "DigitalInput1");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Event);
        assert.strictEqual(documentMembers[0].dataType, "push");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 5);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 18);
        assert.strictEqual(documentMembers[0].blockRange.start.line, 1);
        assert.strictEqual(documentMembers[0].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[0].blockRange.end.line, 3);
        assert.strictEqual(documentMembers[0].blockRange.end.character, 1);

        assert.strictEqual(documentMembers[0].children.length, 1);
        assert.strictEqual(documentMembers[0].children[0].name, "STRING1");
        assert.strictEqual(documentMembers[0].children[0].kind, vscode.CompletionItemKind.Variable);
        assert.strictEqual(documentMembers[0].children[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].children[0].uri, documentName);
        assert.strictEqual(documentMembers[0].children[0].parent.name, "DigitalInput1");
        assert.strictEqual(documentMembers[0].children[0].dataType, "string");
        assert.strictEqual(documentMembers[0].children[0].nameRange.start.line, 2);
        assert.strictEqual(documentMembers[0].children[0].nameRange.start.character, 7);
        assert.strictEqual(documentMembers[0].children[0].nameRange.end.line, 2);
        assert.strictEqual(documentMembers[0].children[0].nameRange.end.character, 14);
    });

    test("It should have an event socketStatus", async () => {
        await OpenAndShowSPlusDocument("socketStatus DigitalInput1\n{\n};");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 1);
        assert.strictEqual(documentMembers[0].name, "DigitalInput1");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Event);
        assert.strictEqual(documentMembers[0].dataType, "socketStatus");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 13);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 26);
        assert.strictEqual(documentMembers[0].blockRange.start.line, 1);
        assert.strictEqual(documentMembers[0].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[0].blockRange.end.line, 2);
        assert.strictEqual(documentMembers[0].blockRange.end.character, 1);
        assert.strictEqual(documentMembers[0].children.length, 0);
    });


    test("It should have an 2 push event and 1 change event with a stacked event declaration. No Variables", async () => {
        await OpenAndShowSPlusDocument("push DigitalInput1, DigitalInput2\nchange DigitalInput3\n{\n};");
        const document = vscode.window.activeTextEditor.document;
        const documentName = document.uri.toString();
        const documentMembers = await SimplPlusParser(vscode.window.activeTextEditor.document);
        assert.strictEqual(documentMembers.length, 3);
        assert.strictEqual(documentMembers[0].name, "DigitalInput1");
        assert.strictEqual(documentMembers[0].kind, vscode.CompletionItemKind.Event);
        assert.strictEqual(documentMembers[0].dataType, "push");
        assert.strictEqual(documentMembers[0].dataTypeModifier, "");
        assert.strictEqual(documentMembers[0].uri, documentName);
        assert.strictEqual(documentMembers[0].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.start.character, 5);
        assert.strictEqual(documentMembers[0].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[0].nameRange.end.character, 18);
        assert.strictEqual(documentMembers[0].blockRange.start.line, 2);
        assert.strictEqual(documentMembers[0].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[0].blockRange.end.line, 3);
        assert.strictEqual(documentMembers[0].blockRange.end.character, 1);
        assert.strictEqual(documentMembers[0].children.length, 0);

        assert.strictEqual(documentMembers[1].name, "DigitalInput2");
        assert.strictEqual(documentMembers[1].kind, vscode.CompletionItemKind.Event);
        assert.strictEqual(documentMembers[1].dataType, "push");
        assert.strictEqual(documentMembers[1].dataTypeModifier, "");
        assert.strictEqual(documentMembers[1].uri, documentName);
        assert.strictEqual(documentMembers[1].nameRange.start.line, 0);
        assert.strictEqual(documentMembers[1].nameRange.start.character, 20);
        assert.strictEqual(documentMembers[1].nameRange.end.line, 0);
        assert.strictEqual(documentMembers[1].nameRange.end.character, 33);
        assert.strictEqual(documentMembers[1].blockRange.start.line, 2);
        assert.strictEqual(documentMembers[1].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[1].blockRange.end.line, 3);
        assert.strictEqual(documentMembers[1].blockRange.end.character, 1);
        assert.strictEqual(documentMembers[1].children.length, 0);

        assert.strictEqual(documentMembers[2].name, "DigitalInput3");
        assert.strictEqual(documentMembers[2].kind, vscode.CompletionItemKind.Event);
        assert.strictEqual(documentMembers[2].dataType, "change");
        assert.strictEqual(documentMembers[2].dataTypeModifier, "");
        assert.strictEqual(documentMembers[2].uri, documentName);
        assert.strictEqual(documentMembers[2].nameRange.start.line, 1);
        assert.strictEqual(documentMembers[2].nameRange.start.character, 7);
        assert.strictEqual(documentMembers[2].nameRange.end.line, 1);
        assert.strictEqual(documentMembers[2].nameRange.end.character, 20);
        assert.strictEqual(documentMembers[2].blockRange.start.line, 2);
        assert.strictEqual(documentMembers[2].blockRange.start.character, 0);
        assert.strictEqual(documentMembers[2].blockRange.end.line, 3);
        assert.strictEqual(documentMembers[2].blockRange.end.character, 1);
        assert.strictEqual(documentMembers[2].children.length, 0);
    });
});

// suite("with a position", function () {
//     test("not inside a block, it should return undefined", async () => {
//         await OpenAndShowSPlusDocument("push DigitalInput1\n{\nBUFFER_INPUT BufferInput1[20];\n};");
//         await delay(50);
//         const mockExtensionContext = (global as any).testExtensionContext;
//         const documentTokenService = DocumentTokenService.getInstance(mockExtensionContext);
//         const uri = vscode.window.activeTextEditor?.document.uri;
//         const position = new vscode.Position(0, 0);
//         const token = documentTokenService.getBlockStatementTokenAtPosition(uri, position);
//         assert.strictEqual(token, undefined);
//     });
//     test("inside a block, should return top most token", async () => {
//         await OpenAndShowSPlusDocument("push DigitalInput1\n{\nBUFFER_INPUT BufferInput1[20];\n};");
//         await delay(50);
//         const mockExtensionContext = (global as any).testExtensionContext;
//         const documentTokenService = DocumentTokenService.getInstance(mockExtensionContext);
//         const uri = vscode.window.activeTextEditor?.document.uri;
//         const position = new vscode.Position(2, 5);
//         const token = documentTokenService.getBlockStatementTokenAtPosition(uri, position);
//         assert.strictEqual(token.name, "DigitalInput1");
//     });
// });