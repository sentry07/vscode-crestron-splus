
import {
    Range,
    TextDocument,
    TextEdit,
    FormattingOptions,
    CancellationToken,
    DocumentRangeFormattingEditProvider,
    DocumentFormattingEditProvider,
    workspace,
} from "vscode";
import * as SimplPlusFormatter from "./helpers/simplPlusFormatter";
export interface RangeFormattingOptions {
    rangeStart: number;
    rangeEnd: number;
}

export class SimplPlusFormattingProvider
    implements
    DocumentRangeFormattingEditProvider,
    DocumentFormattingEditProvider {

    constructor() { }

    public async provideDocumentRangeFormattingEdits(
        document: TextDocument,
        range: Range,
        _options: FormattingOptions,
        _token: CancellationToken
    ): Promise<TextEdit[]> {
        return this.provideEdits(document, {
            rangeEnd: document.offsetAt(range.end),
            rangeStart: document.offsetAt(range.start),
        });
    }

    public async provideDocumentFormattingEdits(
        document: TextDocument,
        _options: FormattingOptions,
        _token: CancellationToken
    ): Promise<TextEdit[]> {
        return this.provideEdits(document);
    }

    private async provideEdits(document: TextDocument, _options?: RangeFormattingOptions): Promise<TextEdit[]> {
        let options: SimplPlusFormatter.SimplPlusBracketFormattingOptions = {
            indentSize: workspace.getConfiguration("crestron-splus").indentSize,
            insertSpaces: workspace.getConfiguration("crestron-splus").insertSpaces,
            openBraceOnNewLine: workspace.getConfiguration("crestron-splus").braceLine,
            keyWordCase: workspace.getConfiguration("crestron-splus").keywordCase,
        };

        let outputText = SimplPlusFormatter.formatCode(document.getText(), options);

        return [new TextEdit(
            this.fullDocumentRange(document),
            outputText)];
    }

    private fullDocumentRange(document: TextDocument): Range {
        const lastLineId = document.lineCount - 1;
        return new Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
    }
}
