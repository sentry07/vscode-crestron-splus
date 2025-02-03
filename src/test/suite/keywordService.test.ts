
import * as assert from 'assert';
import { KeywordService } from '../../services/keywordService';
import { CompletionItemKind } from 'vscode';

suite('With Keyword Service', () => {
    let keywordService: KeywordService;
    setup(() => {
        keywordService = KeywordService.getInstance();
    });
    test('gets 3 class kind Keywords', () => {
        const keywords = keywordService.getKeywordsByKind(([CompletionItemKind.Class]));
        assert.strictEqual(keywords.length, 3);
    });
    test('gets 216 Function kind Keywords', () => {
        const keywords = keywordService.getKeywordsByKind(([CompletionItemKind.Function]));
        assert.strictEqual(keywords.length, 216);
    });
    test('gets 23 Constant Kind Keywords', () => {
        const keywords = keywordService.getKeywordsByKind(([CompletionItemKind.Constant]));
        assert.strictEqual(keywords.length, 23);
    });
    test('gets 108 Keyword Kind Keywords', () => {
        const keywords = keywordService.getKeywordsByKind(([CompletionItemKind.Keyword]));
        assert.strictEqual(keywords.length, 110);
    });
    test('gets 10 Variable Kind Keywords', () => {
        const keywords = keywordService.getKeywordsByKind(([CompletionItemKind.Variable]));
        assert.strictEqual(keywords.length, 10);
    });
});