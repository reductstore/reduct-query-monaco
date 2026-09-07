import { describe, it, expect, beforeAll } from 'vitest';
import {
  SQL_KEYWORDS,
  SQL_FUNCTIONS,
  SQL_COMPARISON_OPERATORS,
  getSqlCompletionProvider,
} from '../src/reductstore/index';

const CompletionItemKind = {
  Snippet: 0,
  Value: 1,
  Field: 2,
  Function: 3,
  Operator: 4,
  Keyword: 5,
};

beforeAll(() => {
  (globalThis as any).window = {
    monaco: {
      languages: { CompletionItemKind },
    },
  };
});

function makeModel(lines: string[]) {
  return {
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
    getLineCount: () => lines.length,
  };
}

function complete(text: string) {
  const lines = text.split('\n');
  const lastLine = lines[lines.length - 1];
  const provider = getSqlCompletionProvider();
  return provider.provideCompletionItems(makeModel(lines), {
    lineNumber: lines.length,
    column: lastLine.length + 1,
  });
}

describe('sql keywords', () => {
  it('should export SQL keywords', () => {
    expect(SQL_KEYWORDS).toBeDefined();
    expect(SQL_KEYWORDS.length).toBeGreaterThan(0);
    expect(SQL_KEYWORDS.find((k) => k.name === 'SELECT')).toBeDefined();
    expect(SQL_KEYWORDS.find((k) => k.name === 'FROM')).toBeDefined();
    expect(SQL_KEYWORDS.find((k) => k.name === 'WHERE')).toBeDefined();
    expect(SQL_KEYWORDS.find((k) => k.name === 'AS')).toBeDefined();
  });

  it('should export SQL functions', () => {
    expect(SQL_FUNCTIONS).toBeDefined();
    expect(SQL_FUNCTIONS.find((f) => f.name === 'ENTRY()')).toBeDefined();
  });

  it('all keywords should have required fields', () => {
    SQL_KEYWORDS.forEach((keyword) => {
      expect(keyword.name).toBeDefined();
      expect(keyword.description).toBeDefined();
      expect(keyword.insertText).toBeDefined();
    });
  });
});

describe('sql operators', () => {
  it('should export only the documented comparison operators', () => {
    expect(SQL_COMPARISON_OPERATORS).toBeDefined();
    expect(SQL_COMPARISON_OPERATORS.map((op) => op.name).sort()).toEqual(['<', '=', '>']);
  });

  it('all operators should have required fields', () => {
    SQL_COMPARISON_OPERATORS.forEach((op) => {
      expect(op.name).toBeDefined();
      expect(op.description).toBeDefined();
      expect(op.insertText).toBeDefined();
    });
  });
});

describe('getSqlCompletionProvider', () => {
  it('should return a completion provider', () => {
    const provider = getSqlCompletionProvider();
    expect(provider).toBeDefined();
    expect(provider.triggerCharacters).toBeDefined();
    expect(typeof provider.provideCompletionItems).toBe('function');
  });

  function expectExactLabels(result: ReturnType<typeof complete>, expected: string[]) {
    const labels = result.suggestions.map((s) => s.label).sort();
    expect(labels).toEqual([...expected].sort());
  }

  it('should suggest only SELECT when no clause has been typed yet', () => {
    expectExactLabels(complete(''), ['SELECT']);
    expectExactLabels(complete(' '), ['SELECT']);
  });

  it('should suggest exactly *, column_0, AS and FROM in the SELECT zone', () => {
    expectExactLabels(complete('SELECT '), ['*', 'column_0', 'AS', 'FROM']);
  });

  it('should suggest exactly ENTRY() and WHERE in the FROM zone', () => {
    expectExactLabels(complete('SELECT * FROM '), ['ENTRY()', 'WHERE']);
  });

  it('should suggest exactly the comparison operators and value placeholders in the WHERE zone', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() WHERE '), [
      '=',
      '<',
      '>',
      'String value',
      'Numeric value',
    ]);
  });

  it('should not suggest keywords while typing inside a string literal', () => {
    const result = complete("SELECT * FROM ENTRY() WHERE temp.status = 'ok");
    expect(result.suggestions).toEqual([]);
  });

  it('should not mistake a column named from_id for the FROM keyword', () => {
    expectExactLabels(complete('SELECT from_id'), ['*', 'column_0', 'AS', 'FROM']);
  });

  it('should not mistake an alias containing "where" for the WHERE keyword', () => {
    expectExactLabels(complete('SELECT temp.a AS elsewhere'), ['*', 'column_0', 'AS', 'FROM']);
  });

  it('should stay in the WHERE zone when a condition identifier contains "from"', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() WHERE fromStatus '), [
      '=',
      '<',
      '>',
      'String value',
      'Numeric value',
    ]);
  });

  it('should stay in the WHERE zone when a string value contains a keyword-like word', () => {
    expectExactLabels(complete("SELECT * FROM ENTRY() WHERE message = 'Selected from cache' "), [
      '=',
      '<',
      '>',
      'String value',
      'Numeric value',
    ]);
  });

  it('should not include the dotted-path prefix in the replacement range after a dot', () => {
    const provider = getSqlCompletionProvider();
    const line = 'SELECT temp.';
    const result = provider.provideCompletionItems(makeModel([line]), {
      lineNumber: 1,
      column: line.length + 1,
    });
    result.suggestions.forEach((s) => {
      expect(s.range.startColumn).toBe(line.length + 1);
      expect(s.range.endColumn).toBe(line.length + 1);
    });
  });
});
