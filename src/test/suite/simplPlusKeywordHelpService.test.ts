import * as assert from 'assert';
import { SimplPlusKeywordHelpService } from '../../services/simplPlusKeywordHelpService';

suite('With SimplPlusKeywordHelpService', () => {
    let helpService: SimplPlusKeywordHelpService;
    setup(async () => {
        helpService = await SimplPlusKeywordHelpService.getInstance();
    });
    test('gets help for Random', async () => {
        const helpMd = await helpService.GetSimplHelp("random");
        assert.notStrictEqual(helpMd, undefined);
    });
    test('gets function info from Random', async () => {
        const helpMd = await helpService.GetSimplHelp("Random");
        const helpFUnction = helpService.GetFunctionInfoFromHelp("Random", helpMd);
        assert.notStrictEqual(helpFUnction, undefined);
        assert.strictEqual(helpFUnction.name, "Random");
        assert.strictEqual(helpFUnction.dataType, "INTEGER");
        assert.strictEqual(helpFUnction.children.length, 2);
        assert.strictEqual(helpFUnction.children[0].name, "LowerBound");
        assert.strictEqual(helpFUnction.children[0].dataType, "INTEGER");
        assert.strictEqual(helpFUnction.children[1].name, "UpperBound");
        assert.strictEqual(helpFUnction.children[1].dataType, "INTEGER");
    });
    test('gets function info from Rnd', async () => {
        const helpMd = await helpService.GetSimplHelp("Rnd");
        const helpFUnction = helpService.GetFunctionInfoFromHelp("Rnd", helpMd);
        assert.notStrictEqual(helpFUnction, undefined);
        assert.strictEqual(helpFUnction.name, "Rnd");
        assert.strictEqual(helpFUnction.dataType, "INTEGER");
        assert.strictEqual(helpFUnction.children.length, 0);
    });
    test('gets function info from ClearBuffer', async () => {
        const helpMd = await helpService.GetSimplHelp("ClearBuffer");
        const helpFUnction = helpService.GetFunctionInfoFromHelp("ClearBuffer", helpMd);
        assert.notStrictEqual(helpFUnction, undefined);
        assert.strictEqual(helpFUnction.name, "ClearBuffer");
        assert.strictEqual(helpFUnction.dataType, "void");
        assert.strictEqual(helpFUnction.children.length, 1);
        assert.strictEqual(helpFUnction.children[0].name, "BUFFERNAME");
        assert.strictEqual(helpFUnction.children[0].dataType, "STRING");
    });
    test('gets function info from Find ', async () => {
        const helpMd = await helpService.GetSimplHelp("Find");
        const helpFUnction = helpService.GetFunctionInfoFromHelp(" Find ", helpMd);
        assert.notStrictEqual(helpFUnction, undefined);
        assert.strictEqual(helpFUnction.name, "Find");
        assert.strictEqual(helpFUnction.dataType, "INTEGER");
        assert.strictEqual(helpFUnction.children.length, 2);
        assert.strictEqual(helpFUnction.children[0].name, "MATCH_STRING");
        assert.strictEqual(helpFUnction.children[0].dataType, "STRING");
        assert.strictEqual(helpFUnction.children[1].name, "SOURCE_STRING");
        assert.strictEqual(helpFUnction.children[1].dataType, "STRING");
    });
});