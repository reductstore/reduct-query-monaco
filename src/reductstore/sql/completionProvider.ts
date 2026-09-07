import { SQL_KEYWORDS, SQL_FUNCTIONS } from './keywords';
import { SQL_COMPARISON_OPERATORS } from './operators';
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

      const isInsideString = (textBeforeCursor.match(/'/g) || []).length % 2 === 1;

      // Build suggestions based on context. "." is treated as a separator (not part of
      // the word) so that completing right after "temp." only replaces the segment being
      // typed, not the whole dotted path already typed before it.
      const suggestions: MonacoCompletionItem[] = [];
      const range = getWordRange(model, position, /\w/);

      // 1. When typing inside a string literal (no suggestions)
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
      const noZoneDetected = !inWhereZone && !inFromZone && !inSelectZone;

      const pushKeyword = (name: string, sortText: string) => {
        const keyword = SQL_KEYWORDS.find((k) => k.name === name);
        if (!keyword) {
          return;
        }
        suggestions.push({
          label: keyword.name,
          kind: CompletionItemKind.Keyword,
          insertText: keyword.insertText,
          detail: keyword.description,
          range,
          sortText,
        });
      };

      // 2. No clause typed yet: SELECT is the only valid entry point of this grammar
      if (noZoneDetected) {
        pushKeyword('SELECT', '100');
      }

      // 3. Column list (after SELECT, before FROM): columns, aliasing, or move to FROM
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
        pushKeyword('AS', '200');
        pushKeyword('FROM', '201');
      }

      // 4. Table source (after FROM, before WHERE): only ENTRY() or move to WHERE
      if (inFromZone) {
        SQL_FUNCTIONS.forEach((fn, index) => {
          suggestions.push({
            label: fn.name,
            kind: CompletionItemKind.Function,
            insertText: fn.insertText,
            detail: fn.description,
            range,
            sortText: `1${index.toString().padStart(2, '0')}`,
          });
        });
        pushKeyword('WHERE', '200');
      }

      // 5. Condition (after WHERE): only comparison operators and value placeholders
      if (inWhereZone) {
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

      return { suggestions };
    },
  };
};
