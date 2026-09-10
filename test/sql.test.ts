import { describe, it, expect, beforeAll } from 'vitest';
import {
  SQL_CLAUSES,
  SQL_FUNCTIONS,
  SQL_COMPARISON_OPERATORS,
  SQL_LOGICAL_OPERATORS,
  SQL_FILTER_OPERATORS,
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

function expectExactLabels(result: ReturnType<typeof complete>, expected: string[]) {
  const labels = result.suggestions.map((s) => s.label).sort();
  expect(labels).toEqual([...expected].sort());
}

// A "condition" zone (WHERE/ON/HAVING) always offers the full comparison/logical/filter
// operator set plus value placeholders, in addition to whichever clauses may follow it.
const CONDITION_LABELS = [
  ...SQL_COMPARISON_OPERATORS.map((op) => op.name),
  ...SQL_LOGICAL_OPERATORS.map((op) => op.name),
  ...SQL_FILTER_OPERATORS.map((op) => op.name),
  'String value',
  'Numeric value',
];

// A completed SELECT statement can always be followed by a set operation
const SET_OP_LABELS = ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'];

describe('sql clauses', () => {
  it('should export SQL clauses', () => {
    expect(SQL_CLAUSES).toBeDefined();
    expect(SQL_CLAUSES.length).toBeGreaterThan(0);
    ['WITH', 'SELECT', 'DISTINCT', 'FROM', 'JOIN', 'ON', 'WHERE', 'GROUP BY', 'HAVING'].forEach(
      (name) => {
        expect(SQL_CLAUSES.find((c) => c.name === name)).toBeDefined();
      },
    );
    ['ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'AS'].forEach((name) => {
      expect(SQL_CLAUSES.find((c) => c.name === name)).toBeDefined();
    });
    ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT'].forEach((name) => {
      expect(SQL_CLAUSES.find((c) => c.name === name)).toBeDefined();
    });
  });

  it('all clauses should have required fields', () => {
    SQL_CLAUSES.forEach((clause) => {
      expect(clause.name).toBeDefined();
      expect(clause.description).toBeDefined();
      expect(clause.insertText).toBeDefined();
    });
  });
});

describe('sql functions', () => {
  it('should export SQL functions', () => {
    expect(SQL_FUNCTIONS).toBeDefined();
    expect(SQL_FUNCTIONS.find((f) => f.name === 'ENTRY()')).toBeDefined();
  });

  it('all functions should have required fields', () => {
    SQL_FUNCTIONS.forEach((fn) => {
      expect(fn.name).toBeDefined();
      expect(fn.description).toBeDefined();
      expect(fn.insertText).toBeDefined();
    });
  });
});

describe('sql operators', () => {
  it('should export the documented comparison operators', () => {
    expect(SQL_COMPARISON_OPERATORS.map((op) => op.name).sort()).toEqual(
      ['=', '!=', '<>', '<', '>', '<=', '>='].sort(),
    );
  });

  it('should export the logical operators', () => {
    expect(SQL_LOGICAL_OPERATORS.map((op) => op.name).sort()).toEqual(['AND', 'OR', 'NOT'].sort());
  });

  it('should export the filter operators', () => {
    expect(SQL_FILTER_OPERATORS.map((op) => op.name).sort()).toEqual(
      ['BETWEEN', 'IN', 'LIKE', 'ILIKE', 'IS NULL', 'IS NOT NULL'].sort(),
    );
  });

  it('all operators should have required fields', () => {
    [...SQL_COMPARISON_OPERATORS, ...SQL_LOGICAL_OPERATORS, ...SQL_FILTER_OPERATORS].forEach(
      (op) => {
        expect(op.name).toBeDefined();
        expect(op.description).toBeDefined();
        expect(op.insertText).toBeDefined();
      },
    );
  });
});

describe('getSqlCompletionProvider', () => {
  it('should return a completion provider', () => {
    const provider = getSqlCompletionProvider();
    expect(provider).toBeDefined();
    expect(provider.triggerCharacters).toBeDefined();
    expect(typeof provider.provideCompletionItems).toBe('function');
  });

  it('should suggest only SELECT and WITH when no clause has been typed yet', () => {
    expectExactLabels(complete(''), ['SELECT', 'WITH']);
    expectExactLabels(complete(' '), ['SELECT', 'WITH']);
  });

  it('should suggest only AS after WITH', () => {
    expectExactLabels(complete('WITH '), ['AS']);
  });

  it('should suggest exactly *, DISTINCT, AS and FROM in the SELECT zone', () => {
    expectExactLabels(complete('SELECT '), ['*', 'DISTINCT', 'AS', 'FROM']);
  });

  it('should suggest ENTRY(), joins, and later clauses in the FROM zone', () => {
    expectExactLabels(complete('SELECT * FROM '), [
      'ENTRY()',
      'JOIN',
      'INNER JOIN',
      'LEFT JOIN',
      'RIGHT JOIN',
      'FULL JOIN',
      'CROSS JOIN',
      'WHERE',
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should suggest only ON in the JOIN zone (ENTRY() only shows after FROM)', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() LEFT JOIN '), ['ON']);
  });

  it('should suggest the full condition set plus later clauses in the ON zone', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() LEFT JOIN ENTRY() ON '), [
      ...CONDITION_LABELS,
      'WHERE',
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should suggest the full condition set plus later clauses in the WHERE zone', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() WHERE '), [
      ...CONDITION_LABELS,
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should suggest exactly HAVING, ORDER BY, LIMIT and set operations in the GROUP BY zone', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() GROUP BY '), [
      'HAVING',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should suggest the full condition set plus later clauses in the HAVING zone', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() GROUP BY column_0 HAVING '), [
      ...CONDITION_LABELS,
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should suggest exactly ASC, DESC, LIMIT and set operations in the ORDER BY zone', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() ORDER BY '), [
      'ASC',
      'DESC',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should suggest exactly a numeric value, OFFSET and set operations in the LIMIT zone', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() LIMIT '), [
      'Numeric value',
      'OFFSET',
      ...SET_OP_LABELS,
    ]);
  });

  it('should suggest exactly a numeric value and set operations in the OFFSET zone', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() LIMIT 10 OFFSET '), [
      'Numeric value',
      ...SET_OP_LABELS,
    ]);
  });

  it('should suggest only SELECT after a set operation', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() UNION '), ['SELECT']);
    expectExactLabels(complete('SELECT * FROM ENTRY() UNION ALL '), ['SELECT']);
    expectExactLabels(complete('SELECT * FROM ENTRY() INTERSECT '), ['SELECT']);
    expectExactLabels(complete('SELECT * FROM ENTRY() EXCEPT '), ['SELECT']);
  });

  it('should not suggest anything while typing inside a string literal', () => {
    const result = complete("SELECT * FROM ENTRY() WHERE temp.status = 'ok");
    expect(result.suggestions).toEqual([]);
  });

  it('should not let an apostrophe inside a -- comment freeze suggestions afterwards', () => {
    // "AND" was just typed, so it's correctly excluded from CONDITION_LABELS here -
    // see the dedicated "should not offer AND/OR/... again" test below
    expectExactLabels(complete("SELECT * FROM ENTRY() WHERE x = 1 -- don't forget\nAND "), [
      ...CONDITION_LABELS.filter((label) => label !== 'AND'),
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should not let a clause keyword inside a comment corrupt zone detection', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() WHERE x = 1 -- then GROUP BY later\nAND '), [
      ...CONDITION_LABELS.filter((label) => label !== 'AND'),
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
    expectExactLabels(
      complete('/* draft: SELECT * FROM t */\nWHERE '),
      ['SELECT', 'WITH'], // no real SELECT was typed, so still zone NONE
    );
  });

  it('should not offer AND/OR/... again right after it has just been typed', () => {
    expect(
      complete('SELECT * FROM ENTRY() WHERE x = 1 AND ').suggestions.map((s) => s.label),
    ).not.toContain('AND');
    expect(
      complete('SELECT * FROM ENTRY() WHERE x BETWEEN ').suggestions.map((s) => s.label),
    ).not.toContain('BETWEEN');
  });

  it('should not mistake a double-quoted identifier for a keyword', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() WHERE "from" = 1 '), [
      ...CONDITION_LABELS,
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should not mistake a column named from_id for the FROM keyword', () => {
    // DISTINCT is correctly absent here: a column (from_id) has already been typed
    expectExactLabels(complete('SELECT from_id'), ['*', 'AS', 'FROM']);
  });

  it('should not mistake an alias containing "where" for the WHERE keyword', () => {
    expectExactLabels(complete('SELECT temp.a AS elsewhere'), ['*', 'AS', 'FROM']);
  });

  it('should stay in the WHERE zone when a condition identifier contains "from"', () => {
    expectExactLabels(complete('SELECT * FROM ENTRY() WHERE fromStatus '), [
      ...CONDITION_LABELS,
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should stay in the WHERE zone when a string value contains a keyword-like word', () => {
    expectExactLabels(complete("SELECT * FROM ENTRY() WHERE message = 'Selected from cache' "), [
      ...CONDITION_LABELS,
      'GROUP BY',
      'ORDER BY',
      'LIMIT',
      ...SET_OP_LABELS,
    ]);
  });

  it('should not offer any suggestion for a bare clause keyword before SELECT ever appears', () => {
    expectExactLabels(complete('foo LIMIT '), ['SELECT', 'WITH']);
    expectExactLabels(complete('foo WHERE '), ['SELECT', 'WITH']);
    expectExactLabels(complete('foo ON '), ['SELECT', 'WITH']);
    expectExactLabels(complete('foo HAVING '), ['SELECT', 'WITH']);
    expectExactLabels(complete('foo OFFSET '), ['SELECT', 'WITH']);
  });

  it('should not offer a two-word clause again while only its first word is typed', () => {
    expect(complete('SELECT * FROM ENTRY() GROUP ').suggestions.map((s) => s.label)).not.toContain(
      'GROUP BY',
    );
    expect(
      complete('SELECT * FROM ENTRY() GROUP BY column_0 ORDER ').suggestions.map((s) => s.label),
    ).not.toContain('ORDER BY');
    expect(complete('SELECT * FROM ENTRY() INNER ').suggestions.map((s) => s.label)).not.toContain(
      'INNER JOIN',
    );
  });

  it('should not offer AS again right after it has just been typed in a WITH clause', () => {
    expectExactLabels(complete('WITH cte AS '), []);
  });

  it('should not suggest DISTINCT once a column has already been listed', () => {
    expect(complete('SELECT col1, ').suggestions.map((s) => s.label)).not.toContain('DISTINCT');
  });

  it('should still suggest DISTINCT while it is being typed', () => {
    expect(complete('SELECT DIST').suggestions.map((s) => s.label)).toContain('DISTINCT');
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
