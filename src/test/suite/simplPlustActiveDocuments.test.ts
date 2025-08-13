import * as assert from 'assert';
import * as sinon from 'sinon';
import { TextDocument, Uri } from 'vscode';
import { SimplPlusActiveDocuments } from '../../simplPlusActiveDocuments';
import * as fsExistsWrapper from '../../helpers/fsExistsSyncWrapper';
import * as fsFileReadWrapper from '../../helpers/fsReadSyncWrapper';
import { removeWorkspaceCustomSettings, } from '../testFunctions';



suite('SimplPlusActiveDocuments', () => {
    let simplPlusActiveDocuments: SimplPlusActiveDocuments;
    let mockDocument: TextDocument;

    setup(() => {
        removeWorkspaceCustomSettings();
        simplPlusActiveDocuments = new SimplPlusActiveDocuments();
        mockDocument = {
            uri: Uri.file('test.usp'),
            languageId: 'simpl-plus',
            isUntitled: false,
            version: 1,
            getText: sinon.stub(),
            lineCount: 1,
            lineAt: sinon.stub(),
            offsetAt: sinon.stub(),
            positionAt: sinon.stub(),
            save: sinon.stub(),
            eol: 1,
            isDirty: false,
            isClosed: false,
            fileName: 'test.usp'
        } as unknown as TextDocument;
    });

    teardown(() => {
        sinon.restore();
    });

    test('should return global values BuildType.Series3 and 4 for a new document', () => {
        const buildType = simplPlusActiveDocuments.GetSimplPlusDocumentBuildTargets(mockDocument);
        assert.strictEqual(buildType.length,2);
        assert.ok(buildType.includes("Series3"));
        assert.ok(buildType.includes("Series4"));
    });

    test('should return global values BuildType.Series3 and 4 for an untitled', () => {
        mockDocument = {
            uri: Uri.file('test.usp'),
            languageId: 'simpl-plus',
            isUntitled: true,
            version: 1,
            getText: sinon.stub(),
            lineCount: 1,
            lineAt: sinon.stub(),
            offsetAt: sinon.stub(),
            positionAt: sinon.stub(),
            save: sinon.stub(),
            eol: 1,
            isDirty: false,
            isClosed: false,
            fileName: 'test.usp'
        } as unknown as TextDocument;
        const buildType = simplPlusActiveDocuments.GetSimplPlusDocumentBuildTargets(mockDocument);
        assert.strictEqual(buildType.length,2);
        assert.ok(buildType.includes("Series3"));
        assert.ok(buildType.includes("Series4"));
    });

    test('should add a new document to SimpPlusDocuments', () => {
        simplPlusActiveDocuments.GetSimplPlusDocumentBuildTargets(mockDocument);
        assert.strictEqual(simplPlusActiveDocuments['_SimpPlusDocuments'].length, 1);
    });

    test('should remove a document from SimpPlusDocuments', () => {
        simplPlusActiveDocuments.GetSimplPlusDocumentBuildTargets(mockDocument);
        simplPlusActiveDocuments.RemoveSimpPlusDocument(mockDocument);
        assert.strictEqual(simplPlusActiveDocuments['_SimpPlusDocuments'].length, 0);
    });

    test('should update targets for an existing document', () => {
        simplPlusActiveDocuments.GetSimplPlusDocumentBuildTargets(mockDocument);
        const updatedBuildType = simplPlusActiveDocuments.UpdateSimpPlusDocumentBuildTargets(mockDocument, ["Series3"]);
        assert.strictEqual(updatedBuildType.length,1);
        assert.ok(updatedBuildType.includes("Series3"));
    });

    test('should return undefined when updating targets for a non-existing document', () => {
        const updatedBuildType = simplPlusActiveDocuments.UpdateSimpPlusDocumentBuildTargets(mockDocument);
        assert.ok(updatedBuildType === undefined);
    });
});

suite('with existing document with ush contents', function ()  {
    let simplPlusActiveDocuments: SimplPlusActiveDocuments;
    let mockDocument: TextDocument;
    const targetsToTest = [
        {
            input: "Inclusions_CDS=5",
            expected: ["Series2"]
        },
        {
            input: "Inclusions_CDS=6",
            expected: ["Series3"]
        },
        {
            input: "Inclusions_CDS=7",
            expected: ["Series4"]
        },
        {
            input: "Inclusions_CDS=5,6",
            expected: ["Series2","Series3"]
        },
        {
            input: "Inclusions_CDS=5,7",
            expected:  ["Series2","Series4"]
        },
        {
            input: "Inclusions_CDS=6,7",
            expected:  ["Series3","Series4"]
        },
        {
            input: "Inclusions_CDS=5,6,7",
            expected: ["Series2","Series3","Series4"]
        },
        {
            input: "should return global",
            expected: ["Series3","Series4"]
        }
    ];
    setup(() => {
        removeWorkspaceCustomSettings();
        simplPlusActiveDocuments = new SimplPlusActiveDocuments();
        mockDocument = {
            uri: Uri.file('test.usp'),
            languageId: 'simpl-plus',
            isUntitled: false,
            version: 1,
            getText: sinon.stub(),
            lineCount: 1,
            lineAt: sinon.stub(),
            offsetAt: sinon.stub(),
            positionAt: sinon.stub(),
            save: sinon.stub(),
            eol: 1,
            isDirty: false,
            isClosed: false,
            fileName: 'test.usp'
        } as unknown as TextDocument;
    });
    teardown(() => {
        sinon.restore();
    });

    targetsToTest.forEach(function (target) {
        test(`should return ${target.expected} for ${target.input}`, function () {
            const fsExistSyncStub = sinon.stub(fsExistsWrapper, "existsSyncWrapper").returns(true);
            const fakeReadFile = sinon.stub(fsFileReadWrapper, 'readFileSyncWrapper').callsFake((test) => {
                return target.input;
            });
            const buildType = simplPlusActiveDocuments.GetSimplPlusDocumentBuildTargets(mockDocument);
            fakeReadFile.restore();
            fsExistSyncStub.restore();
            assert.deepEqual(buildType, target.expected);
        });
    });
});