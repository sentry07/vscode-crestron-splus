import { HoverProvider, Hover, TextDocument, CancellationToken, Position, window } from 'vscode';
import { SimplPlusKeywordHelpService } from './services/simplPlusKeywordHelpService';

export class SimplPlusHoverProvider implements HoverProvider {
    constructor() {

    }
    async provideHover(document: TextDocument, position: Position, Token: CancellationToken) {
        const helpDefinitions = await SimplPlusKeywordHelpService.getInstance();

        const range = document.getWordRangeAtPosition(position);
        const word = document.getText(range);

        try {
            const helpContent = await helpDefinitions.GetSimplHelp(word);
            if (helpContent === undefined) { return undefined; }
            return new Hover(helpContent);
        } catch (error) {
            window.showErrorMessage(`Failed to fetch help content for ${word}: ${error}`);
        }

        return undefined;
    }
}