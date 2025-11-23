import { CompletionItemKind } from "vscode";
import { KeywordService } from "../services/keywordService";

// OpenBraceOnNewLine:  Allman (true) vs K&R style (false)
export interface SimplPlusBracketFormattingOptions {
    indentSize: number;
    insertSpaces: boolean;
    openBraceOnNewLine: boolean;
    keyWordCase: "Unchanged" | "UPPERCASE" | "lowercase" | "PascalCase";
}


/**
 * Format SIMPL+ code with proper bracket placement
 */
export function formatCode(code: string, options: SimplPlusBracketFormattingOptions): string {
    code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // Normalize line endings
    const preservationMap = new Map<string, string>();
    let tempSteps: [string, string][] = [];
    tempSteps.push(["original", code]);

    let processed = preserveContent(code, preservationMap);
    tempSteps.push(["preserveContent", processed]);

    processed = normalizeWhitespace(processed);
    tempSteps.push(["normalizeWhitespace", processed]);

    processed = formatBraceNewLines(processed, options.openBraceOnNewLine);
    tempSteps.push(["formatBraceNewLines", processed]);

    processed = formatOperators(processed);
    tempSteps.push(["formatOperators", processed]);

    processed = handleControlStructures(processed);
    tempSteps.push(["handleControlStructures", processed]);

    processed = restoreDirectives(processed, preservationMap);
    tempSteps.push(["restoreDirectives", processed]);

    processed = applyIndentation(processed, options.insertSpaces, options.indentSize, options.openBraceOnNewLine);
    tempSteps.push(["applyIndentation", processed]);

    processed = changeCase(processed, options.keyWordCase);
    tempSteps.push(["changeCase", processed]);

    processed = restoreContent(processed, preservationMap);
    tempSteps.push(["restoreContent", processed]);

    processed = processed.replace(/\n/g, '\r\n'); // bring back Windows line endings

    /*
    console.log("Formatting Steps:");
    console.log("Step---------------------|Result--------------");
    for (const step of tempSteps) {
        let index = 0;
        for (const line of step[1].split('\n')) {
            if (index === 0) {
                console.log(`${step[0].padEnd(25)}|${line}`);
            }
            else {
                console.log(`${"".padEnd(25)}|${line}`);
            }
            index++;
        }
        console.log("----------------------------------------------");
    }
    */

    return processed.trim();
}

/**
 * Preserve strings and comments from formatting
 */
function preserveContent(code: string, preservationMap: Map<string, string>): string {
    let processed = code;
    let counter = 0;

    // Preserve multi-line comments
    processed = processed.replace(/\/\*[\s\S]*?\*\//g, (match) => {
        const placeholder = `__PRE_ser_VE_BLOCK_${counter++}__`;
        preservationMap.set(placeholder, match.trim());
        return placeholder;
    });

    // Preserver Multi-Line Help Block
    processed = processed.replace(/(\#HELP_BEGIN|\#BEGIN_PROP_FULL_DESCRIPTION|\#BEGIN_PROP_NOTES)\s*\n([\s\S]*?)[^\S\n]*(#HELP_END|\#END_PROP_FULL_DESCRIPTION|\#END_PROP_NOTES)/gim, (match, header, content, footer) => {
        const placeholder = `__PRE_ser_VE_BLOCK_${counter++}__`;
        const replacement = `${header}\n${placeholder}\n${footer}`;
        preservationMap.set(placeholder, content.slice(0,-1));
        return replacement;
    });

    // Preserve single line compiler directives at the beginning of lines
    processed = processed.replace(/^[^\S\n]*\#.*$/gm, (match) => {
        const placeholder = `__PRE_ser_VE_DIRECTIVE_${counter++}__`;
        preservationMap.set(placeholder, match.trim());
        return placeholder;
    });

    // Preserve single-line comments at the beginning of lines
    processed = processed.replace(/^[^\S\n]*\/\/.*$/gm, (match) => {
        const placeholder = `__PRE_ser_VE_SINGLE_${counter++}__`;
        preservationMap.set(placeholder, match.trim());
        return placeholder;
    });

    // Preserve single-line with text before it (adds a space in the beginning)
    processed = processed.replace(/\/\/.*$/gm, (match) => {
        const placeholder = `__PRE_ser_VE_INLINE${counter++}__`;
        preservationMap.set(placeholder, match.trim());
        return placeholder;
    });

    // Preserve multi new lines
    processed = processed.replace(/(?:^\s*$\n){2,}/gm, (match) => {
        const placeholder = `__PRE_ser_VE_MULTI_NEWLINE_${counter++}__\n`;
        preservationMap.set(placeholder, '\n\n');
        return placeholder;
    });

    // Preserve single new lines
    processed = processed.replace(/^[^\S\n]*$/gm, (match) => {
        const placeholder = `__PRE_ser_VE_SINGLE_NEWLINE_${counter++}__`;
        preservationMap.set(placeholder, '\n');
        return placeholder;
    });

    // Preserve string literals (double quotes)
    processed = processed.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
        const placeholder = `__PRE_ser_VE_${counter++}__`;
        preservationMap.set(placeholder, match);
        return placeholder;
    });

    // Preserve character literals (single quotes)
    processed = processed.replace(/'(?:[^'\\]|\\.)*'/g, (match) => {
        const placeholder = `__PRE_ser_VE_${counter++}__`;
        preservationMap.set(placeholder, match);
        return placeholder;
    });



    return processed;
}

/**
 * Restore preserved content
 */
function restoreContent(code: string, preservationMap: Map<string, string>): string {
    let restored = code;
    for (const [placeholder, original] of preservationMap) {
        restored = restored.replace(new RegExp(placeholder, 'g'), original);
    }
    return restored;
}

/**
 * Restore preserved content
 */
function restoreDirectives(code: string, preservationMap: Map<string, string>): string {
    let restored = code;
    let directivesPreservationMap = new Map([...preservationMap].filter(([key]) => key.startsWith('__PRE_ser_VE_DIRECTIVE_')));
    for (const [placeholder, original] of directivesPreservationMap) {
        restored = restored.replace(new RegExp(placeholder, 'g'), `${original}\n`);
    }
    return restored;
}

/**
 * Normalize whitespace while preserving structure
 */
function normalizeWhitespace(code: string): string {
    return code
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .replace(/\s*;\s*/g, '; ') // Semicolons end statements
        .replace(/\s*,\s*/g, ', ') // Commas with space after
        .trim();
}

/**
 * Format brackets according to style settings
 */
function formatBraceNewLines(code: string, openBraceOnNewLine: boolean): string {
    let formatted = code;

    if (openBraceOnNewLine) {
        // Allman style: opening brace on new line. (Double {{ should be ignored as this is an operator)
        // Skip if it has inline comment 
        formatted = formatted.replace(/\s*(?<!{){(?!{)\s*(?!__PRE_ser_VE_INLINE\d+__)/g, '\n{\n');
        // Add New Line after comment and then brace 
        formatted = formatted.replace(/\s*(?<!{){(?!{)(?=\s*__PRE_ser_VE_INLINE\d+__)\s*(__PRE_ser_VE_INLINE\d+__)/g, ' $1\n{\n');
    } else {
        // K&R style: opening brace on same line.  New Line After
        // Formatted already with brace in same line. Add new line. Skip if it has inline comment before brace or after 
        formatted = formatted.replace(/(?<!__PRE_ser_VE_INLINE\d+__\s*)\s*(?<!{){(?!{)(?!\s*__PRE_ser_VE_INLINE\d+__)/g, ' {\n');
        // InLine Comment after Brace. Add brace then comment and then newline 
        formatted = formatted.replace(/\s*(?<!{){(?!{)\s*(__PRE_ser_VE_INLINE\d+__)/g, ' { $1\n');
        // Inline Comment before brace (from Allman Style) Add brace then comment and then newline 
        formatted = formatted.replace(/(__PRE_ser_VE_INLINE\d+__)\s*(?<!{){(?!{)/g, '{ $1\n');
    }

    // Closing braces always on their own line. Disregard preserved content (Double }} should be ignored as this is an operator)
    formatted = formatted.replace(/\s*(?<!})}(?!})\s*(;)?(__PRE_ser_VE_INLINE\d*__)?(?!__PRE_ser_VE_INLINE\d*__)/g, '\n}$1 $2\n');
    // handle consecutive new lines after closing brace
    formatted = formatted.replace(/}\s*(__PRE_ser_VE_INLINE\d*__)?\n\n/g, '} $1\n');

    return formatted;
}

/**
 * Handle special formatting for control structures
 */
function handleControlStructures(code: string): string {
    let formatted = code;

    // do loops
    formatted = formatted.replace(/\}\s*until\s*\(/gi, '} until (');

    // Add new line after semicolons that are not at the end of a line or before preserved comments
    formatted = formatted.replace(/;(?!\s*__PRE_ser_VE_INLINE\d+__|\n)/g, ';\n');
    // // Add new line after inline comments
    formatted = formatted.replace(/;\s*(__PRE_ser_VE_INLINE\d+__)/g, '; $1\n');
    // formatted = formatted.replace(/\s*(__PRE_ser_VE_INLINE\d+__)/g, ' $1\n');

    //Handle Block Comments
    formatted = formatted.replace(/(__PRE_ser_VE_(?:BLOCK|SINGLE)_\d+__)(?!\s*\})/g, '\n$1\n');
    formatted = formatted.replace(/(__PRE_ser_VE_(?:BLOCK|SINGLE)_\d+__)(?=\s*\})/g, '\n$1');

    //Handle empty lines before preserved content
    formatted = formatted.replace(/\n(__PRE_ser_VE_(?:BLOCK|SINGLE)_\d+__)/g, '$1');

    //Handle empty lines after preserved content
    formatted = formatted.replace(/(__PRE_ser_VE_(?:BLOCK|SINGLE)_\d+__)\n/g, '$1\n');

    // handle all double new lines to single new line first
    formatted = formatted.replace(/\n{2,}/g, '\n');

    //Restore multiple new lines to a maximum of two only when not following ; 
    formatted = formatted.replace(/(__PRE_ser_VE_MULTI_NEWLINE_\d+__)(?=\n)/g, '\n');
    formatted = formatted.replace(/(__PRE_ser_VE_MULTI_NEWLINE_\d+__)/g, '\n\n');

    //Restore single empty new lines 
    formatted = formatted.replace(/(__PRE_ser_VE_SINGLE_NEWLINE_\d+__)(?=\n)/g, '');
    formatted = formatted.replace(/(__PRE_ser_VE_SINGLE_NEWLINE_\d+__)/g, '\n');

    return formatted;
}

/**
 * Format operators with proper spacing
 */
function formatOperators(code: string): string {

    // bitwise operators
    code = code.replace(/\s*(<<|>>|{{|}}|(?<!&)&(?!&)|(?<!\|)\|(?!\|)|\^)\s*/g, ' $1 ');

    // Comparison operators
    code = code.replace(/\s*(<>|!=|<=|>=|S<(?!=)|S>(?!=)|S<=|S>=|=)\s*/gi, ' $1 ');

    // Less and greater than operators
    code = code.replace(/\s*((?<![S|<])<(?![>|<|=])|(?<![S|>|<])>(?![>|=]))\s*/gi, ' $1 ');

    // Arithmetic operators
    code = code.replace(/\s*([+\-*/%])\s*/g, ' $1 ');

    // Arithmetic operators
    code = code.replace(/\s+(mod|umod)\s+/gi, ' $1 ');

    code = code.replace(/\s*(&&|\|\|)\s*/g, ' $1 ');

    code = code.replace(/\([^\S\n]*/g, '(')
        .replace(/[^\S\n]*\)/g, ')')
        .replace(/\[[^\S\n]*/g, '[')
        .replace(/[^\S\n]*\]/g, ']')
        // Handle commas
        .replace(/[^\S\n]*,[^\S\n]*/g, ', ');

    code = code.replace(/(for|if|while|switch|case|switch|return|cswitch|until)[\s]*\(/gi, '$1 (');

    return code;
}

/**
 * Apply proper indentation based on brace nesting
 */
function applyIndentation(code: string, insertSpaces: boolean, indentSize: number, openBraceOnNewLine: boolean): string {
    const lines = code.split('\n');
    const indentChar = insertSpaces ? ' '.repeat(indentSize) : '\t';
    let indentLevel = 0;
    const result: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines
        if (trimmed === '') {
            result.push('');
            continue;
        }

        // Decrease indent for closing brace 
        if (trimmed === '}' || trimmed.startsWith('}') || trimmed.match('#END_PARAMETER_PROPERTIES')) {
            indentLevel = Math.max(0, indentLevel - 1);
        }

        if (trimmed.match(/^__PRE_ser_VE_BLOCK_\d+__/)) {
            result.push(trimmed);
        }
        else {
            const oneLineControlStructure = parseOneLineControlStructure(trimmed, indentLevel, indentChar);
            if (oneLineControlStructure.length > 0) {
                result.push(...oneLineControlStructure);
            }
            else {

                // Apply indentation
                const indented = indentLevel > 0 ? indentChar.repeat(indentLevel) + trimmed : trimmed;
                result.push(indented);
            }
        }

        // Increase indent after opening brace
        if (trimmed === '{' || trimmed.endsWith(' {') || trimmed.startsWith('{') || trimmed.match(/{\s*__PRE_ser_VE.*?\b/) || trimmed.startsWith('#BEGIN_PARAMETER_PROPERTIES')) {
            indentLevel++;
        }
    }

    let finalResult = result.join('\n');

    //catch left over inline comments from malformed code
    finalResult = finalResult.replace(/(\s*__PRE_ser_VE_INLINE\d+__)[^\S\n](?!\n)/g, '$1\n');

    return finalResult;
}

function parseParenthesesFirstSet(str: string): [content: string, lastIndex: number] {
    let result = [];
    let i = 0;
    let foundFirst = false;
    while (i < str.length) {
        if (str[i] === '(') {
            let openCount = 1;
            let j = i + 1;
            while (j < str.length && openCount > 0) {
                if (str[j] === '(') { openCount++; }
                else if (str[j] === ')') { openCount--; }
                j++;
            }
            result.push(str.slice(i, j));
            return [result.join(''), j];
        }
        i++;
    }
    return ["", 0];
}



function parseOneLineControlStructure(line: string, indentLevel: number, indentChar: string): string[] {
    let result: string[] = [];
    //handle special statements like IF, FOR, WHILE without braces
    const withInlineComment = line.match(/(__PRE_ser_VE_INLINE\d+__)/i);
    if (withInlineComment) {
        line = line.replace(withInlineComment[0], '').trim();
    }
    const match = line.match(/\b(IF|FOR|WHILE|WAIT|CASE)(?=\s*\()(?!(.*{|.*:\s*$))/i) || [];
    const match2 = line.match(/(\bELSE\b|(?:\bDEFAULT\b\s*\:)).*;/i) || [];
    if (match.length > 0) {
        var condition = parseParenthesesFirstSet(line);
        let statement = "";
        if (match[1].toUpperCase() === "CASE") {
            if (line.indexOf(":") === -1) {
                //malformed case statement
                statement = line.trim();
            }
            else {
                statement = line.slice(0, line.indexOf(":") + 1).trim();
            }
        }
        else {
            statement = line.slice(0, condition[1]).trim();
        }
        let restOfLine = line.replace(statement, '').trim();
        statement = statement + (withInlineComment ? ` ${withInlineComment[0]}` : '');
        const innerLines = parseOneLineControlStructure(restOfLine, indentLevel + 1, indentChar);
        if (innerLines.length === 0) {
            let indented = indentLevel > 0 ? indentChar.repeat(indentLevel) + statement : statement;
            result.push(indented);
            if (restOfLine.length > 0) {
                indented = indentChar.repeat(indentLevel + 1) + restOfLine;
                result.push(indented);
            }
        }
        else {
            const indented = indentLevel > 0 ? indentChar.repeat(indentLevel) + statement : statement;
            result.push(indented);
            result.push(...innerLines);
        }
        return result;
    }
    else if (match2.length > 0) {
        let restOfLine = line.replace(match2[1], '').trim();
        const statement = match2[1] + (withInlineComment ? ` ${withInlineComment[0]}` : '');
        let indented = indentLevel > 0 ? indentChar.repeat(indentLevel) + statement : statement;
        result.push(indented);
        indented = indentChar.repeat(indentLevel + 1) + restOfLine;
        result.push(indented);
        return result;
    }
    else {
        return [];
    }
}


//Changes Case
function changeCase(document: string, keywordCase: "Unchanged" | "UPPERCASE" | "lowercase" | "PascalCase"): string {
    const formatSetting = keywordCase;
    if (formatSetting === "Unchanged") { return document; }
    const keywordService = KeywordService.getInstance();
    const keywords = keywordService.getAllKeywords();

    const words = document.matchAll(/[a-zA-Z0-9#_]+/gm);
    for (const word of words) {
        const keyword = keywords.find(it => it.name.toLowerCase() === word[0].toLowerCase());
        if (keyword === undefined) { continue; }
        if (keyword.type === "Directive") {
            document = replaceAt(document, word.index, keyword.name.toUpperCase());
            continue;
        }
        if (keyword.kind !== CompletionItemKind.Constant) {
            switch (formatSetting) {
                case "UPPERCASE":
                    document = replaceAt(document, word.index, keyword.name.toUpperCase());
                    break;
                case "lowercase":
                    document = replaceAt(document, word.index, keyword.name.toLowerCase());
                    break;
                case "PascalCase":
                    document = replaceAt(document, word.index, keyword.name);
                    break;
                default:
                    break;
            }
        }
        if (keyword.kind === CompletionItemKind.Constant) {
            document = replaceAt(document, word.index, keyword.name);
        }
    }
    return document;
}

function replaceAt(original: string, index: number, replacement: string): string {
    if (index < 0 || index + replacement.length >= original.length) { return original; }
    return original.substring(0, index) + replacement + original.substring(index + replacement.length);
}


