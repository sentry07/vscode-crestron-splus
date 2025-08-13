import { window, workspace } from "vscode";
import * as path from "path";


export function getFileName(): {name: string, directory: string}  {
    const fileNamePath = window.activeTextEditor?.document.fileName?? undefined;
    if (fileNamePath === undefined) { 
        return {name: "", directory: ""}; 
    }
    const directory = path.dirname(fileNamePath);
    const fileName = path.basename(fileNamePath);
    return  {name: fileName, directory: directory} ;
}

export function objectChain(text: string): string[] | undefined {
    if (text[text.length - 1] === "(") {
        text = text.substring(0, text.lastIndexOf("(")) + ".";
    } //tricks algorithm to treat end of functions as part of the chain. Used for signature helper.
    if (text === undefined || text[text.length - 1] !== ".") { return undefined; }
    let chain: string[] = [];
    let a = text.split(".").map(t => t.trim());
    a.pop(); //if the last character is . as asserted by the first condition, the last split will be empty.  Pop It.
    a.reverse(); //reverse the array so we can pop off the last element and short circuit the loop
    a.some(t => {
        const objectMatch = t.match(/([_\w][_#$\w]*)(?:\s*\[.*\])?(?:\s*\(.*\))?$/); //match any word followed by an optional set of parenthesis or square brackets
        if (objectMatch === null) { return true; } //terminate loop if the match is null
        const object = objectMatch[1];
        chain.push(object);
        if (objectMatch.index !== 0) { return true; } //terminate the loop if the match is not at the beginning of the string indicating the chain broke with that last match
        return false;
    });
    chain.reverse();
    return chain.length > 0 ? chain : undefined;
}