import { describe, it, expect, beforeAll } from 'vitest';
import {
  SQL_KEYWORDS,
  SQL_FUNCTIONS,
  SQL_COMPARISON_OPERATORS,
  SQL_EXAMPLES,
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

describe('sql examples', () => {
  it('should export examples', () => {
    expect(SQL_EXAMPLES).toBeDefined();
    expect(SQL_EXAMPLES.length).toBeGreaterThan(0);
  });

  it('all examples should have required fields and reference ENTRY()', () => {
    SQL_EXAMPLES.forEach((ex) => {
      expect(ex.name).toBeDefined();
      expect(ex.description).toBeDefined();
      expect(ex.insertText).toBeDefined();
      expect(ex.insertText).toContain('FROM ENTRY()');
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

  it('should suggest complete examples on an empty document', () => {
    const result = complete('');
    const labels = result.suggestions.map((s) => s.label);
    SQL_EXAMPLES.forEach((example) => {
      expect(labels).toContain(example.name);
    });
  });

  it('should suggest * and column_0 after SELECT', () => {
    const result = complete('SELECT ');
    const labels = result.suggestions.map((s) => s.label);
    expect(labels).toContain('*');
    expect(labels).toContain('column_0');
  });

  it('should suggest ENTRY() after FROM', () => {
    const result = complete('SELECT * FROM ');
    const labels = result.suggestions.map((s) => s.label);
    expect(labels).toContain('ENTRY()');
  });

  it('should suggest comparison operators after WHERE', () => {
    const result = complete('SELECT * FROM ENTRY() WHERE ');
    const labels = result.suggestions.map((s) => s.label);
    expect(labels).toContain('=');
    expect(labels).toContain('<');
    expect(labels).toContain('>');
    expect(labels).not.toContain('<=');
    expect(labels).not.toContain('!=');
  });

  it('should not suggest keywords while typing inside a string literal', () => {
    const result = complete("SELECT * FROM ENTRY() WHERE temp.status = 'ok");
    expect(result.suggestions).toEqual([]);
  });

  it('should not mistake a column named from_id for the FROM keyword', () => {
    const result = complete('SELECT from_id');
    const labels = result.suggestions.map((s) => s.label);
    expect(labels).toContain('*');
    expect(labels).toContain('column_0');
    expect(labels).not.toContain('=');
  });

  it('should not mistake an alias containing "where" for the WHERE keyword', () => {
    const result = complete('SELECT temp.a AS elsewhere');
    const labels = result.suggestions.map((s) => s.label);
    expect(labels).toContain('*');
    expect(labels).not.toContain('=');
  });

  it('should stay in the WHERE zone when a condition identifier contains "from"', () => {
    const result = complete('SELECT * FROM ENTRY() WHERE fromStatus ');
    const labels = result.suggestions.map((s) => s.label);
    expect(labels).toContain('=');
    expect(labels).not.toContain('*');
  });

  it('should stay in the WHERE zone when a string value contains a keyword-like word', () => {
    const result = complete("SELECT * FROM ENTRY() WHERE message = 'Selected from cache' ");
    const labels = result.suggestions.map((s) => s.label);
    expect(labels).toContain('=');
    expect(labels).not.toContain('*');
  });

  it('should not treat the cursor at the start of a pre-filled document as document start', () => {
    const provider = getSqlCompletionProvider();
    const result = provider.provideCompletionItems(makeModel(['SELECT * FROM ENTRY()']), {
      lineNumber: 1,
      column: 1,
    });
    const labels = result.suggestions.map((s) => s.label);
    SQL_EXAMPLES.forEach((example) => {
      expect(labels).not.toContain(example.name);
    });
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

  it('should rank SELECT ahead of ENTRY() before any clause has been typed', () => {
    const result = complete(' ');
    const select = result.suggestions.find((s) => s.label === 'SELECT');
    const entry = result.suggestions.find((s) => s.label === 'ENTRY()');
    expect(select).toBeDefined();
    expect(entry).toBeDefined();
    expect(select!.sortText! < entry!.sortText!).toBe(true);
  });
});
