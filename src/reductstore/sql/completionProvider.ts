import { SQL_KEYWORDS, SQL_FUNCTIONS } from './keywords';
import { SQL_COMPARISON_OPERATORS } from './operators';
import { SQL_EXAMPLES } from './examples';
import {
  MonacoModel,
  MonacoPosition,
  MonacoCompletionItem,
  MonacoCompletionResult,
} from '../types';
import { getWordRange } from '../wordRange';

export const getSqlCompletionProvider = () => {
  return {
    triggerCharacters: [' ', '.', ','],
    provideCompletionItems: (
      model: MonacoModel,
      position: MonacoPosition,
    ): MonacoCompletionResult => {
      const monaco = (window as any).monaco;
      const CompletionItemKind = monaco.languages.CompletionItemKind;

      // Get context from the start of the document up to the cursor
      let textBeforeCursor = '';
      for (let line = 1; line < position.lineNumber; line++) {
        textBeforeCursor += model.getLineContent(line) + '\n';
      }
      const currentLine = model.getLineContent(position.lineNumber);
      textBeforeCursor += currentLine.substring(0, position.column - 1);

      // "Document start" means the model itself is empty, not just blank before the
      // cursor - otherwise resetting the cursor to (1, 1) in a pre-filled editor would
      // wrongly re-trigger the full example snippets and insert them into existing text
      const isDocumentStart = model.getLineCount() === 1 && model.getLineContent(1).length === 0;
      const isInsideString = (textBeforeCursor.match(/'/g) || []).length % 2 === 1;

      // Build suggestions based on context
      const suggestions: MonacoCompletionItem[] = [];
      const range = getWordRange(model, position, /[\w.]/);

      // 1. When document is completely empty (suggest complete examples)
      if (isDocumentStart) {
        SQL_EXAMPLES.forEach((example, index) => {
          suggestions.push({
            label: example.name,
            kind: CompletionItemKind.Snippet,
            insertText: example.insertText,
            detail: example.description,
            documentation: 'Complete SQL query example',
            range,
            sortText: `0${index.toString().padStart(2, '0')}`,
          });
        });
        return { suggestions };
      }

      // 2. When typing inside a string literal (no keyword suggestions)
      if (isInsideString) {
        return { suggestions: [] };
      }

      // Find which clause the cursor is currently in (word-boundary match on text with
      // closed string literals blanked out, so identifiers like "from_id" and quoted
      // values like 'Selected from cache' aren't mistaken for keywords)
      const textWithoutStrings = textBeforeCursor.replace(/'[^']*'/g, (match) =>
        ' '.repeat(match.length),
      );
      const lastKeywordIndex = (keyword: string): number => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        let lastIndex = -1;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(textWithoutStrings)) !== null) {
          lastIndex = match.index;
        }
        return lastIndex;
      };
      const lastSelect = lastKeywordIndex('SELECT');
      const lastFrom = lastKeywordIndex('FROM');
      const lastWhere = lastKeywordIndex('WHERE');

      const inWhereZone = lastWhere !== -1 && lastWhere > lastFrom && lastWhere > lastSelect;
      const inFromZone = !inWhereZone && lastFrom !== -1 && lastFrom > lastSelect;
      const inSelectZone = !inWhereZone && !inFromZone && lastSelect !== -1;

      // 3. When in the column list (after SELECT, before FROM)
      if (inSelectZone) {
        suggestions.push(
          {
            label: '*',
            kind: CompletionItemKind.Value,
            insertText: '*',
            detail: 'All columns',
            range,
            sortText: '100',
          },
          {
            label: 'column_0',
            kind: CompletionItemKind.Field,
            insertText: 'column_0',
            detail: 'CSV column without header (column_0, column_1, ...)',
            range,
            sortText: '101',
          },
        );
      }

      // 4. When in the condition (after WHERE)
      if (inWhereZone) {
        // Comparison operators (priority 1XX)
        SQL_COMPARISON_OPERATORS.forEach((op, index) => {
          suggestions.push({
            label: op.name,
            kind: CompletionItemKind.Operator,
            insertText: op.insertText,
            detail: op.description,
            range,
            sortText: `1${index.toString().padStart(2, '0')}`,
          });
        });

        // Value placeholders (priority 2XX)
        suggestions.push(
          {
            label: 'String value',
            kind: CompletionItemKind.Value,
            insertText: "'value'",
            detail: 'String value (single-quoted)',
            range,
            sortText: '200',
          },
          {
            label: 'Numeric value',
            kind: CompletionItemKind.Value,
            insertText: '100',
            detail: 'Numeric value',
            range,
            sortText: '201',
          },
        );
      }

      // 5. ENTRY() table function (priority 1XX after FROM, 8XX as a general fallback)
      const functionPriority = inFromZone ? '1' : '8';
      SQL_FUNCTIONS.forEach((fn, index) => {
        suggestions.push({
          label: fn.name,
          kind: CompletionItemKind.Function,
          insertText: fn.insertText,
          detail: fn.description,
          range,
          sortText: `${functionPriority}${index.toString().padStart(2, '0')}`,
        });
      });

      // 6. Keywords as a general fallback (priority 9XX)
      SQL_KEYWORDS.forEach((keyword, index) => {
        suggestions.push({
          label: keyword.name,
          kind: CompletionItemKind.Keyword,
          insertText: keyword.insertText,
          detail: keyword.description,
          range,
          sortText: `9${index.toString().padStart(2, '0')}`,
        });
      });

      return { suggestions };
    },
  };
};
