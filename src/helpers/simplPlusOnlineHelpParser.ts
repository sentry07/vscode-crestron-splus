import { ExtensionContext } from "vscode";
import { SimplPlusKeywordHelpService } from "../services/simplPlusKeywordHelpService";
import * as fs from "fs";

//to be used only once, or when information in the keywords.csv file changes or when information in help.crestron.com/SIMPL+ changes
//it reads through the keywords.csv file and checks every entry against help.crestron.com to see if help can be parsed from it
//then it creates a new keywords2.csv file to add a column with hasHelp
async function parseSimplPlusOnlineHelp(context: ExtensionContext): Promise<void> {
    const helpService = await SimplPlusKeywordHelpService.getInstance();
    const keywordFilePath = context.asAbsolutePath("support/keywords.csv");
    const keywordFile = fs.readFileSync(keywordFilePath).toString();
    let definitions: { name: string, kind: string, type: string, hasHelp: boolean }[] = [];
    for (const entry of keywordFile.split("\n")) {
        const elements = entry.split(",");
        if (elements.length !== 3) { continue; }
        const help = await helpService.GetSimplHelp(elements[0].trim());
        const definition = {
            name: elements[0].trim(),
            kind: elements[1].trim(),
            type: elements[2].trim(),
            hasHelp: help !== undefined
        };
        definitions.push(definition);
    }

    const newFile = definitions.map(it => {
        return Object.values(it).toString();
    }).join('\r\n');

    const newFilePath = context.asAbsolutePath("support/keywords2.csv");
    fs.writeFileSync(newFilePath, newFile);
};

export async function parseSimplPlusFunctionReturnFromOnlineHelp(context: ExtensionContext): Promise<void> {
    const helpService = await SimplPlusKeywordHelpService.getInstance();
    const keywordFilePath = context.asAbsolutePath("support/keywords.csv");
    const keywordFile = fs.readFileSync(keywordFilePath).toString();
    let definitions: { name: string, kind: string, type: string, hasHelp: boolean }[] = [];
    for (const entry of keywordFile.split("\n")) {
        const elements = entry.split(",");
        let type = elements[2].trim();
        if (elements.length !== 4) { continue; }
        const help = await helpService.GetSimplHelp(elements[0].trim());
        if (elements[2].trim() === "function" && elements[3].trim() === "true") {
            let functionInfo = helpService.GetFunctionInfoFromHelp(elements[0].trim(), help);
            type = functionInfo.dataType;
        }
        const definition = {
            name: elements[0].trim(),
            kind: elements[1].trim(),
            type,
            hasHelp: elements[3].trim()=== "true"
        };
        definitions.push(definition);
    }

    const newFile = definitions.map(it => {
        return Object.values(it).toString();
    }).join('\r\n');

    const newFilePath = context.asAbsolutePath("src/keywords2.csv");
    fs.writeFileSync(newFilePath, newFile);
};