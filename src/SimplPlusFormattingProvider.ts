
import {
    Range,
    TextDocument,
    TextEdit,
    FormattingOptions,
    CancellationToken,
    DocumentRangeFormattingEditProvider,
    DocumentFormattingEditProvider,
    workspace,
    extensions,
    CompletionItem,
    CompletionItemKind,
} from "vscode";
import { KeywordService } from "./services/keywordService";
const os = require('os');

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
        let outputText = this.formatNewLines(document.getText());
        outputText = this.indentText(outputText);
        return [new TextEdit(
            this.fullDocumentRange(document),
            outputText)];
    }

    private fullDocumentRange(document: TextDocument): Range {
        const lastLineId = document.lineCount - 1;
        return new Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
    }

    private formatNewLines(docText: string): string {
        let endOfLineCharacter = os.EOL;                                     // whether to add the suffix or not

        const addLine: boolean = workspace.getConfiguration("simpl-plus").braceLine;
        let docLines = docText.split(/\r?\n/);                      // Split into lines
        let openBracketDoc: string[] = [];
        let closeBracketDoc: string[] = [];
        docLines.forEach((line, index) => {
            const bracketQty = line.split("{").length - 1;
            let currentLineChunk = line;
            let modifiedLines: string[] = [];
            for (let i = 0; i < bracketQty; i++) {
                const textBeforeBracket = currentLineChunk.substring(0, currentLineChunk.indexOf("{")).trimStart();
                if (addLine) { //curly bracket in new line
                    if (textBeforeBracket.length > 0) { //if there is text before bracket add  text and move { to new line
                        modifiedLines.push(textBeforeBracket);
                        modifiedLines.push("{");
                    }
                    else {
                        modifiedLines.push("{");  //if the bracket by itself already, just add it.
                    }
                }
                else { //curly bracket at the end of the line
                    if (textBeforeBracket.length > 0) { //if there is text before bracket add a new line after bracket
                        modifiedLines.push(textBeforeBracket.trimEnd() + " {");
                    }
                    else { //if there is no text before bracket, move bracket to the line before
                        if (modifiedLines.length > 0) {
                            const lastLine = modifiedLines[modifiedLines.length - 1];
                            if (lastLine[lastLine.length - 1] === "{") { // if the last line already has a bracket, put it in a new line
                                modifiedLines.push("{");
                            }
                            else {  //if the last line does not have a bracket, add the bracket to the previous line
                                modifiedLines[modifiedLines.length - 1] = modifiedLines[modifiedLines.length - 1].trimEnd() + " {";
                            }
                        }
                        else if (openBracketDoc.length > 0) {
                            const lastLine = openBracketDoc[openBracketDoc.length - 1];
                            if (lastLine[lastLine.length - 1] === "{") { // if the last line already has a bracket, put it in a new line
                                modifiedLines.push("{");
                            }
                            else {  //if the last line does not have a bracket, add the bracket to the previous line
                                openBracketDoc[openBracketDoc.length - 1] = openBracketDoc[openBracketDoc.length - 1].trimEnd() + " {";
                            }
                        }
                        else {
                            modifiedLines.push("{"); //bracket is the firs in line, let it be;
                        }
                    }
                }
                currentLineChunk = currentLineChunk.substring(currentLineChunk.indexOf("{") + 1);
            }
            if (currentLineChunk.trim().length > 0) {  //add reminder of text if there is any
                modifiedLines.push(currentLineChunk);
            }
            if (modifiedLines.length > 0) { //add modified lines
                openBracketDoc.push(...modifiedLines);
            }
            if (line.trim().length === 0) { //re-add original line if line was empty
                openBracketDoc.push("");
            }
        });
        openBracketDoc.forEach((line, index) => {
            const bracketQty = line.split("}").length - 1;
            let currentLineChunk = line;
            let modifiedLines: string[] = [];
            for (let i = 0; i < bracketQty; i++) {
                const textBeforeBracket = currentLineChunk.substring(0, currentLineChunk.indexOf("}"));
                if (textBeforeBracket.length < currentLineChunk.length) {
                    let endSequence = "}";
                    const textAfterBracket = currentLineChunk.substring(1).trim(); //catch for closing brackets followed by semicolon
                    if (textAfterBracket === ";") {
                        endSequence = "};";
                        currentLineChunk = textAfterBracket.substring(1);
                    }
                    modifiedLines.push(textBeforeBracket + endSequence);
                }
                currentLineChunk = currentLineChunk.substring(currentLineChunk.indexOf("}") + 1);
            }
            if (currentLineChunk.trim().length > 0) {
                modifiedLines.push(currentLineChunk);
            }
            if (modifiedLines.length > 0) {
                closeBracketDoc.push(...modifiedLines);
            }
            if (line.trim().length === 0) {
                closeBracketDoc.push("");
            }
        });
        const finalDoc = closeBracketDoc.join(endOfLineCharacter);
        return finalDoc;
    }

    // trims the beginning of all lines and then inserts tabs as necessary depending on curly brackets
    private indentText(docText: string): string {
        // Set up variables for grabbing and replacing the text
        let outputText: string = "";
        let indentLevel: number = 0;                                        // Current line indent level (number of tabs)
        let commentLevel: number = 0;                                          // If we're in a comment and what level
        let inSignalList: boolean = false;                                       // If we're in a list of signals
        let isCommentStart: boolean = false;                                    // Check if this line starts a comment
        let isCommentEnd: boolean = false;                                      // Check if this line ends a comment
        let isSignalListStart: boolean = false;
        let docLines = docText.split(/\r?\n/);                      // Split into lines

        let endOfLineCharacter = os.EOL;                                     // whether to add the suffix or not

        // Comment weeders
        let singleLineCommentRegex: RegExp = /(\/\/.*)/gm;                                // Single line comment
        let oneLineMultilineComment: RegExp = /((?:\/\*).*(?:\*\/))/gm;               // Fully enclosed multiline comment
        let closingMultiLineComment: RegExp = /(.*(?:\*\/))/gm;                       // Closing multiline comment
        let openingMultiLineComment: RegExp = /((?:\/\*).*)/gm;                       // Opening multiline comment
        let reString: RegExp = /'[^']*'/gm;                            // single quote string literal

        for (var line = 0; line < docLines.length; line++) {
            isCommentStart = false;
            isCommentEnd = false;
            let thisLine = docLines[line];
            let thisLineTrimmed = docLines[line].trimStart();
            let thisLineClean = docLines[line].trimStart().replace(singleLineCommentRegex, "").replace(oneLineMultilineComment, "");      // Remove any single line comments and fully enclosed multiline comments

            if (closingMultiLineComment.test(thisLineClean) && commentLevel > 0) {        // If a multiline comment closes on this line, decrease our comment level
                commentLevel = commentLevel - 1;
                if (commentLevel === 0) {
                    isCommentEnd = true;
                }
            }
            if (openingMultiLineComment.test(thisLineClean)) {                         // If a multiline comment opens on this line, increase our comment level
                if (commentLevel === 0) {
                    isCommentStart = true;                                // If this line starts a multiline comment, it still needs to be checked
                }
                ++commentLevel;
            }

            thisLineClean = thisLineClean.replace(closingMultiLineComment, "").replace(openingMultiLineComment, "");            // Remove any code that we think is inside multiline comments
            thisLineClean = thisLineClean.replace(reString, "");                                  // Remove any string literals from the line so we don't get false positives
            let brOpen = this.countChars(thisLineClean, '{') - this.countChars(thisLineClean, '}');         // Check the delta for squiggly brackets
            let sqOpen = this.countChars(thisLineClean, '[') - this.countChars(thisLineClean, ']');         // Check the delta for square brackets
            let parOpen = this.countChars(thisLineClean, '(') - this.countChars(thisLineClean, ')');        // Check the delta for parenthesis
            let indentDelta = brOpen + sqOpen + parOpen;                                          // Calculate total delta

            if ((
                thisLineClean.toLowerCase().includes("digital_input") ||
                thisLineClean.toLowerCase().includes("analog_input") ||
                thisLineClean.toLowerCase().includes("string_input") ||
                thisLineClean.toLowerCase().includes("buffer_input") ||
                thisLineClean.toLowerCase().includes("digital_output") ||
                thisLineClean.toLowerCase().includes("analog_output") ||
                thisLineClean.toLowerCase().includes("string_output")
            ) && !thisLineClean.includes(";")) {
                inSignalList = true;
                isSignalListStart = true;
            }

            if (line === docLines.length - 1) {
                endOfLineCharacter = '';
            }

            // Indent Increase Rules
            if (inSignalList) {
                if (isSignalListStart) {
                    outputText = outputText + thisLineTrimmed + endOfLineCharacter;
                    isSignalListStart = false;
                }
                else {
                    outputText = outputText + ('\t'.repeat(4)) + thisLineTrimmed + endOfLineCharacter;
                    if (thisLineTrimmed.includes(";")) {
                        inSignalList = false;
                    }
                }
            }
            // If we're in a multiline comment, just leave the line alone unless it's the start of a ML comment
            else if ((commentLevel > 0 && !isCommentStart) || (!commentLevel && isCommentEnd)) {
                outputText = outputText + thisLine + endOfLineCharacter;
            }
            // If we're increasing indent delta because of this line, the add it, then increase indent
            else if (indentDelta > 0) {
                outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + endOfLineCharacter;
                indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
            }
            // If we're decreasing delta, and the line starts with the character that is decreasing it, then decrease first, and then add this line
            else if (indentDelta < 0 && (thisLineClean[0] === '}' || thisLineClean[0] === ']' || thisLineClean[0] === ')')) {
                indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
                outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + endOfLineCharacter;
            }
            // If we're decreasing delta but the first character isn't the cause, then we're still inside the block
            else if (indentDelta < 0) {
                outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + endOfLineCharacter;
                indentLevel = (indentLevel + indentDelta >= 0) ? (indentLevel + indentDelta) : 0;
            }
            // indentDelta === 0; do nothing except add the line with the indent
            else {
                outputText = outputText + ('\t'.repeat(indentLevel)) + thisLineTrimmed + endOfLineCharacter;
            }
        };

        outputText = this.changeCase(outputText);
        return outputText;
    }

    private countChars(haystack: string, needle: string): number {
        let count = 0;
        for (var i = 0; i < haystack.length; i++) {
            if (haystack[i] === needle) {
                count++;
            }
        }
        return count;
    }

    private changeCase(document: string): string {
        const formatSetting = workspace.getConfiguration("simpl-plus").keywordCase;
        if (formatSetting === "Unchanged") { return document; }
        const keywordService = KeywordService.getInstance();
        const keywords = keywordService.getAllKeywords();

        const words = document.matchAll(/[a-zA-Z1-9#_]+/g);
        for (const word of words) {
            const keyword = keywords.find(it => it.name.toLowerCase() === word[0].toLowerCase());
            if (keyword === undefined) { continue; }
            if (keyword.kind !== CompletionItemKind.Constant) {
                switch (formatSetting) {
                    case "UPPERCASE":
                        document = this.replaceAt(document, word.index, keyword.name.toUpperCase());
                        break;
                    case "lowercase":
                        document = this.replaceAt(document, word.index, keyword.name.toLowerCase());
                        break;
                    case "PascalCase":
                        document = this.replaceAt(document, word.index, keyword.name);
                        break;
                    default:
                        break;
                }
            }
            if (keyword.kind === CompletionItemKind.Constant) {
                document = this.replaceAt(document, word.index, keyword.name);
            }
        }
        return document;
    }

    private replaceAt(original: string, index: number, replacement: string): string {
        if (index < 0 || index + replacement.length >= original.length) { return original; }
        return original.substring(0, index) + replacement + original.substring(index + replacement.length);
    }
}
