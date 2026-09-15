import { SQL_CLAUSES } from './clauses';
import { SQL_FUNCTIONS } from './functions';
import { SQL_COMPARISON_OPERATORS, SQL_LOGICAL_OPERATORS, SQL_FILTER_OPERATORS } from './operators';
import {
  MonacoModel,
  MonacoPosition,
  MonacoCompletionItem,
  MonacoCompletionResult,
} from '../types';
import { getWordRange } from '../wordRange';

// Anchors used to find which clause the cursor is currently in: the clause whose keyword
// appears last (word-boundary match) before the cursor is the one currently being written.
const CLAUSE_ANCHORS: { zone: string; pattern: string }[] = [
  { zone: 'WITH', pattern: '\\bWITH\\b' },
  { zone: 'SELECT', pattern: '\\bSELECT\\b' },
  { zone: 'FROM', pattern: '\\bFROM\\b' },
  { zone: 'JOIN', pattern: '\\bJOIN\\b' },
  { zone: 'ON', pattern: '\\bON\\b' },
  { zone: 'WHERE', pattern: '\\bWHERE\\b' },
  { zone: 'GROUP_BY', pattern: '\\bGROUP\\s+BY\\b' },
  { zone: 'HAVING', pattern: '\\bHAVING\\b' },
  { zone: 'ORDER_BY', pattern: '\\bORDER\\s+BY\\b' },
  { zone: 'LIMIT', pattern: '\\bLIMIT\\b' },
  { zone: 'OFFSET', pattern: '\\bOFFSET\\b' },
  { zone: 'SET_OP', pattern: '\\b(UNION|INTERSECT|EXCEPT)\\b' },
];

const SET_OPERATIONS = ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'];

type MaskState = 'normal' | 'string' | 'identifier' | 'lineComment' | 'blockComment';

// Single left-to-right pass masking strings, quoted identifiers, and comments, so a
// delimiter that's just literal text inside one of them isn't mistaken for a real one.
// Masked characters become "#", never a real space, so a masked span right before the
// cursor is never confused with whitespace the user actually typed (see isAlreadyTyped).
const MASK_CHAR = '#';

const maskNonCode = (text: string): { masked: string; endState: MaskState } => {
  let masked = '';
  let state: MaskState = 'normal';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (state === 'normal') {
      if (ch === "'") {
        state = 'string';
        masked += MASK_CHAR;
      } else if (ch === '"') {
        state = 'identifier';
        masked += MASK_CHAR;
      } else if (ch === '-' && next === '-') {
        state = 'lineComment';
        masked += MASK_CHAR.repeat(2);
        i++;
      } else if (ch === '/' && next === '*') {
        state = 'blockComment';
        masked += MASK_CHAR.repeat(2);
        i++;
      } else {
        masked += ch;
      }
      continue;
    }
    if (ch === '\n') {
      masked += '\n';
      if (state === 'lineComment') {
        state = 'normal';
      }
      continue;
    }
    if (state === 'string' && ch === "'") {
      state = 'normal';
      masked += MASK_CHAR;
    } else if (state === 'identifier' && ch === '"') {
      state = 'normal';
      masked += MASK_CHAR;
    } else if (state === 'blockComment' && ch === '*' && next === '/') {
      state = 'normal';
      masked += MASK_CHAR.repeat(2);
      i++;
    } else {
      masked += MASK_CHAR;
    }
  }
  return { masked, endState: state };
};

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

      // Find which clause the cursor is currently in (word-boundary match on text with
      // closed string literals, quoted identifiers, and comments masked out, so
      // identifiers like "from_id", quoted identifiers like "from", and quoted or
      // commented-out values aren't mistaken for keywords)
      const { masked: textWithoutStrings, endState } = maskNonCode(textBeforeCursor);

      // Build suggestions based on context. "." is treated as a separator (not part of
      // the word) so that completing right after "temp." only replaces the segment being
      // typed, not the whole dotted path already typed before it.
      const suggestions: MonacoCompletionItem[] = [];
      const range = getWordRange(model, position, /\w/);

      // 1. When typing inside a comment, string literal, or quoted identifier (no suggestions)
      if (endState !== 'normal') {
        return { suggestions: [] };
      }

      const lastIndexOfPattern = (pattern: string): number => {
        const regex = new RegExp(pattern, 'gi');
        let lastIndex = -1;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(textWithoutStrings)) !== null) {
          lastIndex = match.index;
        }
        return lastIndex;
      };

      let zone = 'NONE';
      let zoneIndex = -1;
      let lastSelectIndex = -1;
      for (const anchor of CLAUSE_ANCHORS) {
        const index = lastIndexOfPattern(anchor.pattern);
        if (anchor.zone === 'SELECT') {
          lastSelectIndex = index;
        }
        if (index > zoneIndex) {
          zoneIndex = index;
          zone = anchor.zone;
        }
      }

      // Every zone other than WITH is only reachable once a SELECT has actually been
      // typed - otherwise a stray word matching a clause keyword (e.g. an identifier
      // named "limit") would be mistaken for that clause with no query around it at all
      if (zone !== 'NONE' && zone !== 'WITH' && lastSelectIndex === -1) {
        zone = 'NONE';
      }

      const isCrossJoin =
        zone === 'JOIN' &&
        /\bCROSS\s+JOIN$/i.test(textWithoutStrings.slice(0, zoneIndex + 'JOIN'.length));

      // The run of whole words immediately before the cursor, only when followed by a
      // trailing space - e.g. "GROUP BY x IS NOT " gives ["IS", "NOT"] - so a clause or
      // operator already being typed isn't suggested again. Offering "GROUP BY" right
      // after "GROUP " (or "IS NOT NULL" right after "IS NOT ") would duplicate the words
      // already there into "GROUP GROUP BY" / "IS NOT IS NOT NULL", since the replacement
      // range collapses to the cursor position right after the trailing space
      const trailingWordsMatch = /([A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*)\s+$/.exec(
        textWithoutStrings,
      );
      const trailingTypedWords = trailingWordsMatch
        ? trailingWordsMatch[1].toUpperCase().split(/\s+/)
        : [];
      const trailingSymbolMatch = /([=!<>]+)\s+$/.exec(textWithoutStrings);
      const trailingTypedSymbol = trailingSymbolMatch ? trailingSymbolMatch[1] : '';

      const isAlreadyTyped = (label: string) => {
        if (trailingTypedSymbol !== '' && label === trailingTypedSymbol) {
          return true;
        }
        if (trailingTypedWords.length === 0) {
          return false;
        }
        const labelWords = label.toUpperCase().split(' ');
        const overlap = Math.min(trailingTypedWords.length, labelWords.length);
        for (let words = 1; words <= overlap; words++) {
          const typedTail = trailingTypedWords.slice(trailingTypedWords.length - words).join(' ');
          const labelHead = labelWords.slice(0, words).join(' ');
          if (typedTail === labelHead) {
            return true;
          }
        }
        return false;
      };

      // sortText only controls the display order of the dropdown list (Monaco sorts
      // suggestions by comparing this string like a dictionary would). Rather than pick
      // priority numbers by hand, each suggestion just gets "the next number" in the
      // order it's added below, so the list is shown in exactly that order.
      let order = 0;
      const nextSortText = () => (order++).toString().padStart(3, '0');

      const pushClause = (name: string) => {
        const clause = SQL_CLAUSES.find((c) => c.name === name);
        if (!clause || isAlreadyTyped(clause.name)) {
          return;
        }
        suggestions.push({
          label: clause.name,
          kind: CompletionItemKind.Keyword,
          insertText: clause.insertText,
          detail: clause.description,
          range,
          sortText: nextSortText(),
        });
      };

      const textSinceZoneStart = textWithoutStrings.slice(zoneIndex).toUpperCase();
      const isFunctionAlreadyTyped = (name: string) => {
        const upperName = name.toUpperCase();
        const openForm = upperName.endsWith('()') ? upperName.slice(0, -1) : upperName;
        return textSinceZoneStart.includes(openForm);
      };

      const pushFunctions = () => {
        SQL_FUNCTIONS.forEach((fn) => {
          if (isFunctionAlreadyTyped(fn.name)) {
            return;
          }
          suggestions.push({
            label: fn.name,
            kind: CompletionItemKind.Function,
            insertText: fn.insertText,
            detail: fn.description,
            range,
            sortText: nextSortText(),
          });
        });
      };

      const pushColumns = () => {
        suggestions.push({
          label: '*',
          kind: CompletionItemKind.Value,
          insertText: '*',
          detail: 'All columns',
          range,
          sortText: nextSortText(),
        });
      };

      const pushNumericValue = () => {
        suggestions.push({
          label: 'Numeric value',
          kind: CompletionItemKind.Value,
          insertText: '100',
          detail: 'Numeric value',
          range,
          sortText: nextSortText(),
        });
      };

      const pushSetOperations = () => {
        SET_OPERATIONS.forEach((name) => pushClause(name));
      };

      // A row filter condition: comparison operators, then logical operators, then filter
      // operators, then value placeholders, then whichever clauses may follow it
      const pushCondition = (nextClauses: string[]) => {
        SQL_COMPARISON_OPERATORS.forEach((op) => {
          if (isAlreadyTyped(op.name)) {
            return;
          }
          suggestions.push({
            label: op.name,
            kind: CompletionItemKind.Operator,
            insertText: op.insertText,
            detail: op.description,
            range,
            sortText: nextSortText(),
          });
        });
        SQL_LOGICAL_OPERATORS.forEach((op) => {
          if (isAlreadyTyped(op.name)) {
            return;
          }
          suggestions.push({
            label: op.name,
            kind: CompletionItemKind.Keyword,
            insertText: op.insertText,
            detail: op.description,
            range,
            sortText: nextSortText(),
          });
        });
        SQL_FILTER_OPERATORS.forEach((op) => {
          if (isAlreadyTyped(op.name)) {
            return;
          }
          suggestions.push({
            label: op.name,
            kind: CompletionItemKind.Keyword,
            insertText: op.insertText,
            detail: op.description,
            range,
            sortText: nextSortText(),
          });
        });
        suggestions.push(
          {
            label: 'String value',
            kind: CompletionItemKind.Value,
            insertText: "'value'",
            detail: 'String value (single-quoted)',
            range,
            sortText: nextSortText(),
          },
          {
            label: 'Numeric value',
            kind: CompletionItemKind.Value,
            insertText: '100',
            detail: 'Numeric value',
            range,
            sortText: nextSortText(),
          },
        );
        nextClauses.forEach((name) => pushClause(name));
      };

      switch (zone) {
        // 2. Nothing typed yet: SELECT or WITH are the only valid entry points
        case 'NONE':
          pushClause('SELECT');
          pushClause('WITH');
          break;

        // 3. After WITH: only a CTE name (unknown to us) followed by AS is valid
        case 'WITH':
          pushClause('AS');
          break;

        // 4. Column list (after SELECT, before FROM). DISTINCT, AS, and FROM are only
        // grammatically valid once at least one column has started being written
        case 'SELECT': {
          const afterSelect = textWithoutStrings.slice(lastSelectIndex + 'SELECT'.length).trim();
          const canSuggestDistinct =
            afterSelect === '' || 'DISTINCT'.startsWith(afterSelect.toUpperCase());
          pushColumns();
          if (canSuggestDistinct) {
            pushClause('DISTINCT');
          }
          if (afterSelect !== '') {
            pushClause('AS');
            pushClause('FROM');
          }
          break;
        }

        // 5. Table source (after FROM): ENTRY(), a join, or move straight to a later clause
        case 'FROM':
          pushFunctions();
          pushClause('JOIN');
          pushClause('INNER JOIN');
          pushClause('LEFT JOIN');
          pushClause('RIGHT JOIN');
          pushClause('FULL JOIN');
          pushClause('CROSS JOIN');
          pushClause('WHERE');
          pushClause('GROUP BY');
          pushClause('ORDER BY');
          pushClause('LIMIT');
          pushSetOperations();
          break;

        // 6. Join target (after JOIN, before ON): ENTRY() is only suggested after FROM.
        // CROSS JOIN never takes an ON condition, so it moves straight to a later clause
        case 'JOIN':
          if (isCrossJoin) {
            pushClause('WHERE');
            pushClause('GROUP BY');
            pushClause('ORDER BY');
            pushClause('LIMIT');
            pushSetOperations();
          } else {
            pushClause('ON');
          }
          break;

        // 7. Join condition (after ON): same grammar as WHERE
        case 'ON':
          pushCondition(['WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', ...SET_OPERATIONS]);
          break;

        // 8. Row filter (after WHERE)
        case 'WHERE':
          pushCondition(['GROUP BY', 'ORDER BY', 'LIMIT', ...SET_OPERATIONS]);
          break;

        // 9. Grouping columns (after GROUP BY)
        case 'GROUP_BY':
          pushClause('HAVING');
          pushClause('ORDER BY');
          pushClause('LIMIT');
          pushSetOperations();
          break;

        // 10. Group filter (after HAVING): same grammar as WHERE
        case 'HAVING':
          pushCondition(['ORDER BY', 'LIMIT', ...SET_OPERATIONS]);
          break;

        // 11. Sort columns (after ORDER BY)
        case 'ORDER_BY':
          pushClause('ASC');
          pushClause('DESC');
          pushClause('LIMIT');
          pushSetOperations();
          break;

        // 12. Row limit (after LIMIT)
        case 'LIMIT':
          pushNumericValue();
          pushClause('OFFSET');
          pushSetOperations();
          break;

        // 13. Row offset (after OFFSET)
        case 'OFFSET':
          pushNumericValue();
          pushSetOperations();
          break;

        // 14. After a set operation (UNION/INTERSECT/EXCEPT): a new SELECT statement starts
        case 'SET_OP':
          pushClause('SELECT');
          break;
      }

      return { suggestions };
    },
  };
};
