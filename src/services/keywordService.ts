import { extensions, CompletionItemKind, CompletionItem, CompletionItemLabel, window } from "vscode";
import { readFileSyncWrapper } from "../helpers/fsReadSyncWrapper";
import * as fsExistsWrapper from '../helpers/fsExistsSyncWrapper';
import * as path from "path";

export type Keyword = {
    name: string,
    kind: CompletionItemKind,
    type: string,
    hasHelp: boolean
}

export class KeywordService {
    private _keywordDefinitions: Keyword[] = [];
    private static _instance: KeywordService;
    public static getInstance(): KeywordService {
        if (!KeywordService._instance) {
            KeywordService._instance = new KeywordService();
        }
        return KeywordService._instance;
    }

    private constructor() {
        const extensionPath = extensions.getExtension("sentry07.simpl-plus")?.extensionPath;
        if (extensionPath === undefined) { return; }
        const keywordDefinitionsPath = path.join(extensionPath, "support", "keywords.csv");
        if (!fsExistsWrapper.existsSyncWrapper(keywordDefinitionsPath)) {
            window.showErrorMessage("SIMPL+ Keywords not found. Reinstall Extension");
        };
        const keywordDefinitionsContent = readFileSyncWrapper(keywordDefinitionsPath);
        for (const entry of keywordDefinitionsContent.split("\n")) {
            const elements = entry.split(",");
            if (elements.length !== 4) { continue; }
            const definition = {
                name: elements[0].trim(),
                kind: CompletionItemKind[elements[1].trim()],
                type: elements[2].trim(),
                hasHelp: elements[3].trim() === "true"
            };
            this._keywordDefinitions.push(definition);
        }
    }
    public getKeywordsByType(types: string[]): Keyword[] {
        return this._keywordDefinitions.filter(kd => types.includes(kd.type));
    }

    public getKeywordsByKind(kinds: CompletionItemKind[]): Keyword[] {
        let keywords: Keyword[] = [];
        for (const kind of kinds) {
            keywords = keywords.concat(this._keywordDefinitions.filter(kd => kd.kind === kind));
        }
        return keywords;
    }

    public getAllKeywords(): Keyword[] { return this._keywordDefinitions; }

    public getKeyword(name: string): Keyword | undefined {
        return this._keywordDefinitions.find(kd => kd.name.toLowerCase() === name.toLowerCase());
    }

    public getCompletionItemsFromKeywords(keywords: Keyword[]): CompletionItem[] {
        const items: CompletionItem[] = keywords.map(kd => {
            kd.name = kd.name.replace(/^\#/g, "");
            let description = `BuiltIn: ${kd.type.toString()}`;
            if (kd.kind === CompletionItemKind.Keyword) {
                description = `Keyword: ${kd.type.toString()}`;
            };
            let itemLabel: CompletionItemLabel = {
                label: kd.name,
                description: description
            };
            const item = new CompletionItem(itemLabel, kd.kind);
            if (kd.kind === CompletionItemKind.Function) {
                item.command = {
                    command: "editor.action.triggerParameterHints",
                    title: "triggerSignatureHelp",
                };
            }
            return item;
        });
        return items;
    }


    public getCompletionItemsFromBuiltInTypes(builtInKeyword: string): CompletionItem[] {
        switch (builtInKeyword.toLowerCase()) {
            case "tcp_client":
            case "udp_client":
            case "tcp_server":
                return socketStrucMembers.map(kd => {
                    let itemLabel: CompletionItemLabel = {
                        label: kd.name,
                        description: kd.type.toString()
                    };
                    return new CompletionItem(itemLabel, kd.kind);
                });
            case "file_info":
                return fileInfoStructMembers.map(kd => {
                    let itemLabel: CompletionItemLabel = {
                        label: kd.name,
                        description: kd.type.toString()
                    };
                    return new CompletionItem(itemLabel, kd.kind);
                });
            case "cevent":
                return cEventClassMembers.map(kd => {
                    let itemLabel: CompletionItemLabel = {
                        label: kd.name,
                        description: kd.type.toString()
                    };
                    return new CompletionItem(itemLabel, kd.kind);
                });
            case "cmutex":
                return cMutexClassMembers.map(kd => {
                    let itemLabel: CompletionItemLabel = {
                        label: kd.name,
                        description: kd.type.toString()
                    };
                    return new CompletionItem(itemLabel, kd.kind);
                });
            default:
                break;
        }
        return [];
    }
}

const socketStrucMembers = [
    {
        name: "SocketStatus",
        kind: CompletionItemKind.Variable,
        type: "INTEGER",
        hasHelp: false
    },
    {
        name: "SocketRxBuf",
        kind: CompletionItemKind.Variable,
        type: "STRING",
        hasHelp: false
    }
];

const cEventClassMembers = [
    {
        name: "Close",
        kind: CompletionItemKind.Method,
        type: "void",
        hasHelp: false
    },
    {
        name: "Reset",
        kind: CompletionItemKind.Method,
        type: "Signed_Long",
        hasHelp: false
    },
    {
        name: "Set",
        kind: CompletionItemKind.Method,
        type: "Signed_Long",
        hasHelp: false
    },
    {
        name: "Wait",
        kind: CompletionItemKind.Method,
        type: "Signed_Long",
        hasHelp: false
    },
];

const cMutexClassMembers = [
    {
        name: "Close",
        kind: CompletionItemKind.Method,
        type: "void",
        hasHelp: false
    },
    {
        name: "ReleaseMutex",
        kind: CompletionItemKind.Method,
        type: "void",
        hasHelp: false
    },
    {
        name: "WaitForMutex",
        kind: CompletionItemKind.Method,
        type: "Signed_Long",
        hasHelp: false
    }
];

const fileInfoStructMembers = [
    {
        name: "Name",
        kind: CompletionItemKind.Variable,
        type: "STRING",
        hasHelp: false
    },
    {
        name: "iAttributes",
        kind: CompletionItemKind.Variable,
        type: "INTEGER",
        hasHelp: false
    },
    {
        name: "iTime",
        kind: CompletionItemKind.Variable,
        type: "INTEGER",
        hasHelp: false
    },
    {
        name: "iDate",
        kind: CompletionItemKind.Variable,
        type: "INTEGER",
        hasHelp: false
    },
    {
        name: "lSize",
        kind: CompletionItemKind.Variable,
        type: "LONG_INTEGER",
        hasHelp: false
    }
];
