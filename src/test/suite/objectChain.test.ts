import { objectChain } from "../../helpers/helperFunctions";
import * as assert from 'assert';

suite('Object Chain Tests', () => {
    test('Test Object Chain', async () => {
        const textToTest = `            async  testFunction (something, something, something)
            .test2.
            testStr1(   testasdf  ,   asdf ).
            intField.`;
        const result = objectChain(textToTest);
        assert.strictEqual(result.length, 4);
        assert.strictEqual(result[0], "testFunction");
        assert.strictEqual(result[1], "test2");
        assert.strictEqual(result[2], "testStr1");
        assert.strictEqual(result[3], "intField");
    });
    test('Test Object Chain when function begins', async () => {
        const textToTest = `            async  testFunction (something, something, something)
            .test2.
            testStr1(   testasdf  ,   asdf ).
            intField  (`;
        const result = objectChain(textToTest);
        assert.strictEqual(result.length, 4);
        assert.strictEqual(result[0], "testFunction");
        assert.strictEqual(result[1], "test2");
        assert.strictEqual(result[2], "testStr1");
        assert.strictEqual(result[3], "intField");
    });
    test('Test Object Chain with equal in the beginning', async () => {
        const textToTest = `            async =  testFunction (something, something, something)
            .test2.
            testStr1(   testasdf  ,   asdf ).
            intField.`;
        const result = objectChain(textToTest);
        assert.strictEqual(result.length, 4);
        assert.strictEqual(result[0], "testFunction");
        assert.strictEqual(result[1], "test2");
        assert.strictEqual(result[2], "testStr1");
        assert.strictEqual(result[3], "intField");
    });
    test('Test Object Chain with equal and with variable with square brackets', async () => {
        const textToTest = `            async =  testFunction (something, something, something)
            .test2[2].
            testStr1[3](   testasdf  ,   asdf ).
            intField.`;
        const result = objectChain(textToTest);
        assert.strictEqual(result.length, 4);
        assert.strictEqual(result[0], "testFunction");
        assert.strictEqual(result[1], "test2");
        assert.strictEqual(result[2], "testStr1");
        assert.strictEqual(result[3], "intField");
    });
    test('Test Object unfinished sequence', async () => {
        const textToTest = `            async =  testFunction (something, something, something)
            .test2[2].
            testStr1[3](   testasdf  ,   asdf ).
            intField`;
        const result = objectChain(textToTest);
        assert.strictEqual(result, undefined);
    });
    test('no sequence', async () => {
        const textToTest = `            async test test`;
        const result = objectChain(textToTest);
        assert.strictEqual(result, undefined);
    });
    test('one element', async () => {
        const textToTest = `            async test test   .`;
        const result = objectChain(textToTest);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0], "test");
    });
});