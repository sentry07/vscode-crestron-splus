import { workspace, Range, TextDocument, CompletionItemKind } from 'vscode';
import { SimplPlusObject } from '../base/simplPlusObject';
import * as fs from 'fs';

//parses an API fle to create SimplObject hierarchy per class and enum
export async function ApiParser(apiFullPath: string): Promise<SimplPlusObject[]> {
    if (!fs.existsSync(apiFullPath)) {return;}
    //@ts-ignore
    const apiDocument = await workspace.openTextDocument(apiFullPath);
    const apiDocumentContent = apiDocument.getText();
    const apiClassesMatches = apiDocumentContent.matchAll(/class\s*([\w]*)\s*{([^}]*)/gm);
    const apiClasses: SimplPlusObject[] = [];
    for (let apiClass of apiClassesMatches) {
        const classStart = apiDocument.positionAt(apiClass.index + apiClass[0].indexOf("{") + 1);
        const classEnd = apiDocument.positionAt(apiClass.index + apiClass[0].length);
        const classBodyRange = new Range(classStart, classEnd);
        const classNameRange = apiDocument.getWordRangeAtPosition(apiDocument.positionAt(apiClass.index + apiClass[0].indexOf(apiClass[1]))) ?? classBodyRange;
        let delegates: SimplPlusObject[] = [];
        let events: SimplPlusObject[] = [];
        let functions: SimplPlusObject[] = [];
        let properties: SimplPlusObject[] = [];
        let variables: SimplPlusObject[] = [];
        let delegateProperties: SimplPlusObject[] = [];
        const delegatesArea = apiClass[2].match(/class delegates([^\/]*)/m);
        if (delegatesArea && delegatesArea.index && delegatesArea[1]) {
            const delegatesStart = apiDocument.positionAt(apiDocument.offsetAt(classStart) + delegatesArea.index);
            const delegatesEnd = apiDocument.positionAt(apiDocument.offsetAt(classStart) + delegatesArea.index + delegatesArea[0].length);
            const delegatesRange = new Range(delegatesStart, delegatesEnd);
            delegates = getDelegates(delegatesRange, apiDocument);
        }
        const eventsArea = apiClass[2].match(/class events([^\/]*)/m);
        if (eventsArea && eventsArea.index && eventsArea[1]) {
            const eventsStart = apiDocument.positionAt(apiDocument.offsetAt(classStart) + eventsArea.index);
            const eventsEnd = apiDocument.positionAt(apiDocument.offsetAt(classStart) + eventsArea.index + eventsArea[0].length);
            const eventsRange = new Range(eventsStart, eventsEnd);
            events = getEvents(eventsRange, apiDocument);
        }
        const functionsArea = apiClass[2].match(/class functions([^\/]*)/m);
        if (functionsArea && functionsArea.index && functionsArea[1]) {
            const delegatesStart = apiDocument.positionAt(apiDocument.offsetAt(classStart) + functionsArea.index);
            const delegatesEnd = apiDocument.positionAt(apiDocument.offsetAt(classStart) + functionsArea.index + functionsArea[0].length);
            const delegatesRange = new Range(delegatesStart, delegatesEnd);
            functions = getFunctions(delegatesRange, apiDocument);
        }

        const variablesArea = apiClass[2].match(/class variables([^\/]*)/m);
        if (variablesArea && variablesArea.index && variablesArea[1]) {
            const variablesStart = apiDocument.positionAt(apiDocument.offsetAt(classStart) + variablesArea.index);
            const variablesEnd = apiDocument.positionAt(apiDocument.offsetAt(classStart) + variablesArea.index + variablesArea[0].length);
            const variablesRange = new Range(variablesStart, variablesEnd);
            variables = getVariables(variablesRange, apiDocument);
        }

        const propertiesArea = apiClass[2].match(/class properties([^\}]*)/m);
        if (propertiesArea && propertiesArea.index && propertiesArea[1]) {
            const propertiesStart = apiDocument.positionAt(apiDocument.offsetAt(classStart) + propertiesArea.index);
            const propertiesEnd = apiDocument.positionAt(apiDocument.offsetAt(classStart) + propertiesArea.index + propertiesArea[0].length);
            const propertiesRange = new Range(propertiesStart, propertiesEnd);
            properties = getProperties(propertiesRange, apiDocument);
        }
        const children: SimplPlusObject[] = [
            ...events,
            ...delegates,
            ...functions,
            ...variables,
            ...properties
        ];
        const apiClassObject: SimplPlusObject = {
            name: apiClass[1],
            kind: CompletionItemKind.Class,
            nameRange: classNameRange,
            dataType: "class",
            blockRange: classBodyRange,
            children,
            uri: apiDocument.uri.toString(),
            dataTypeModifier: ""
        };
        apiClassObject.children.forEach(c => c.parent = apiClassObject );
        apiClasses.push(apiClassObject);
    }
    const apiEnumMatches = apiDocumentContent.matchAll(/enum\s*([\w]*)\s*{([^}]*)/gm);
    const apiEnums: SimplPlusObject[] = [];
    for (let apiEnum of apiEnumMatches) {
        const enumStart = apiDocument.positionAt(apiEnum.index + apiEnum[0].indexOf("{") + 1);
        const enumEnd = apiDocument.positionAt(apiEnum.index + apiEnum[0].length);
        const enumBodyRange = new Range(enumStart, enumEnd);
        const enumNameRange = apiDocument.getWordRangeAtPosition(apiDocument.positionAt(apiEnum.index + apiEnum[0].indexOf(apiEnum[1]))) ?? enumBodyRange;
        const enumMembers: SimplPlusObject[] = [];
        const enumObject: SimplPlusObject = {
            name: apiEnum[1],
            kind: CompletionItemKind.Enum,
            nameRange: enumNameRange,
            dataType: "enum",
            blockRange: enumBodyRange,
            children: enumMembers,
            uri: apiDocument.uri.toString(),
            dataTypeModifier: ""
        };
        const enumMembersMatch = apiEnum[2].matchAll(/(\w*),/gm);
        for (let enumMember of enumMembersMatch) {
            const memberNameRange = apiDocument.getWordRangeAtPosition(apiDocument.positionAt(apiEnum.index + apiEnum[0].indexOf(enumMember[1]))) ?? enumBodyRange;
            enumMembers.push({
                name: enumMember[1],
                kind: CompletionItemKind.EnumMember,
                nameRange: memberNameRange,
                dataType: apiEnum[1] + "." + enumMember[1],
                dataTypeModifier: "",
                children: [],
                uri: apiDocument.uri.toString(),
                parent: enumObject
            });
        }
        enumObject.children = enumMembers;
        apiEnums.push(enumObject);
    }
    const apiElements = apiClasses.concat(apiEnums);
    return apiElements;
}

function getDelegates(delegatesArea: Range, document: TextDocument): SimplPlusObject[] {
    let delegates: SimplPlusObject[] = [];
    const delegatesText = document.getText(delegatesArea);
    const delegateMatches = delegatesText.matchAll(/delegate\s*([\w]*)\s*([\w]*)\s*\((.*)\)/gm);
    for (let delegateMatch of delegateMatches) {
        const nameRange = document.getWordRangeAtPosition(
            document.positionAt(document.offsetAt(delegatesArea.start) + delegateMatch.index + delegateMatch[0].indexOf(delegateMatch[2]))
        ) ?? delegatesArea;
        const parameterStart = document.positionAt(document.offsetAt(delegatesArea.start) + delegateMatch.index + delegateMatch[0].indexOf("("));
        const parametersEnd = document.positionAt(document.offsetAt(delegatesArea.start) + delegateMatch.index + delegateMatch[0].indexOf(")") + 1);
        const parametersRange = new Range(parameterStart, parametersEnd);
        const parameters = getParameters(parametersRange, document);
        const delegate: SimplPlusObject ={
            name: delegateMatch[2],
            kind: CompletionItemKind.Class,
            nameRange,
            dataType: delegateMatch[1],
            children: parameters,
            dataTypeModifier: "delegate",
            uri: document.uri.toString()
        };
        parameters.forEach(p=>p.parent=delegate);
        delegates.push(delegate);
    }
    return delegates;
}

function getEvents(eventsArea: Range, document: TextDocument): SimplPlusObject[] {
    let events: SimplPlusObject[] = [];
    const eventsText = document.getText(eventsArea);
    const eventMatches = eventsText.matchAll(/EventHandler\s*([\w]*)\s*\((.*)\)/gm);
    for (let eventMatch of eventMatches) {
        const nameRange = document.getWordRangeAtPosition(
            document.positionAt(document.offsetAt(eventsArea.start) + eventMatch.index + eventMatch[0].indexOf(eventMatch[1]))
        ) ?? eventsArea;
        const parameterStart = document.positionAt(document.offsetAt(eventsArea.start) + eventMatch.index + eventMatch[0].indexOf("("));
        const parametersEnd = document.positionAt(document.offsetAt(eventsArea.start) + eventMatch.index + eventMatch[0].indexOf(")") + 1);
        const parametersRange = new Range(parameterStart, parametersEnd);
        const parameters = getParameters(parametersRange, document);
        const event: SimplPlusObject ={
            name: eventMatch[1],
            kind: CompletionItemKind.Event,
            nameRange,
            children: parameters,
            dataTypeModifier: "EventHandler",
            dataType: "void",
            uri: document.uri.toString()
        };
        parameters.forEach(p=>p.parent=event);
        events.push(event);
    }
    return events;
}

function getFunctions(functionsArea: Range, document: TextDocument): SimplPlusObject[] {
    let functions: SimplPlusObject[] = [];
    const functionsText = document.getText(functionsArea);
    const functionMatches = functionsText.matchAll(/([\w]*)\s*([\w]*)\s*\((.*)\)/gm);
    for (let functionMatch of functionMatches) {
        const nameRange = document.getWordRangeAtPosition(
            document.positionAt(document.offsetAt(functionsArea.start) + functionMatch.index + functionMatch[0].indexOf(functionMatch[2]))
        ) ?? functionsArea;
        const parameterStart = document.positionAt(document.offsetAt(functionsArea.start) + functionMatch.index + functionMatch[0].indexOf("("));
        const parametersEnd = document.positionAt(document.offsetAt(functionsArea.start) + functionMatch.index + functionMatch[0].indexOf(")") + 1);
        const parametersRange = new Range(parameterStart, parametersEnd);
        const parameters = getParameters(parametersRange, document);
        let type = functionMatch[1];
        const functionTypeMatch = type.match(/(?:(LONG_INTEGER|INTEGER|SIGNED_INTEGER|SIGNED_LONG_INTEGER|STRING)_)?FUNCTION/i);
        if (functionTypeMatch) {
            type = !functionTypeMatch[1] ? "void" : functionTypeMatch[1];
        }
        const func: SimplPlusObject ={
            name: functionMatch[2],
            kind: CompletionItemKind.Function,
            nameRange,
            children: parameters,
            dataType: type,
            dataTypeModifier: "",
            uri: document.uri.toString(),
        };
        parameters.forEach(p=>p.parent=func);
        functions.push(func);
    }
    return functions;
}

function getVariables(variablesArea: Range, document: TextDocument): SimplPlusObject[] {
    let variables: SimplPlusObject[] = [];
    const variablesText = document.getText(variablesArea);
    const variablesMatches = variablesText.matchAll(/([\w]*)\s*([\w]*)\s*(?:\[,*\])?;/gm);
    for (let variableMatch of variablesMatches) {
        const nameRange = document.getWordRangeAtPosition(
            document.positionAt(document.offsetAt(variablesArea.start) + variableMatch.index + variableMatch[0].indexOf(variableMatch[2]))
        ) ?? variablesArea;
        variables.push({
            name: variableMatch[2],
            kind: CompletionItemKind.Variable,
            nameRange,
            dataType: variableMatch[1],
            children: [],
            dataTypeModifier: "",
            uri: document.uri.toString(),
        });
    }
    return variables;
}

function getProperties(propertiesArea: Range, document: TextDocument): SimplPlusObject[] {
    let properties: SimplPlusObject[] = [];
    const variablesText = document.getText(propertiesArea);
    const propertyMatches = variablesText.matchAll(/(\w*)?\s*(\w*)\s*(\w*\s*(?:\[,*\])?)\s*;/gm);
    for (let propertyMatch of propertyMatches) {
        let dataTypeModifier = propertyMatch[1];
        let dataType = propertyMatch[2];
        let name = propertyMatch[3];
        if (propertyMatch[1] === undefined) {
            dataTypeModifier = "";
        };
        const nameRange = document.getWordRangeAtPosition(
            document.positionAt(document.offsetAt(propertiesArea.start) + propertyMatch.index + propertyMatch[0].indexOf(name))
        ) ?? propertiesArea;
        properties.push({
            name,
            kind: CompletionItemKind.Property,
            nameRange,
            dataType,
            dataTypeModifier,
            children: [],
            uri: document.uri.toString(),
        });
    }
    return properties;
}



function getParameters(parameterArea: Range, document: TextDocument): SimplPlusObject[] {
    let parameters: SimplPlusObject[] = [];
    const parametersText = document.getText(parameterArea);

    const parameterMatches = parametersText.matchAll(/(?<=[\,\(])\s*([\w]*)?\s*([\w]*)\s*([\w]*)\s*(?=[\,\)])/gm);
    for (let parameterMatch of parameterMatches) {
        if (parameterMatch[0].trim() === "") { continue; }
        let typeIndex = (parameterMatch[3] === "") ? 1 : 2;
        const nameRange = document.getWordRangeAtPosition(
            document.positionAt(document.offsetAt(parameterArea.start) + parameterMatch.index + parameterMatch[0].indexOf(parameterMatch[typeIndex + 1]))
        ) ?? parameterArea;
        parameters.push({
            name: parameterMatch[typeIndex + 1].trim(),
            kind: CompletionItemKind.TypeParameter,
            dataType: parameterMatch[typeIndex].trim(),
            blockRange: parameterArea,
            children: [],
            dataTypeModifier: "",
            uri: document.uri.toString(),
            nameRange: nameRange
        });
    }
    return parameters;
}

