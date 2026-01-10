import { describe, it, expect } from 'vitest';
import {
  COMPARISON_OPERATORS,
  LOGICAL_OPERATORS,
  STRING_OPERATORS,
  ARITHMETIC_OPERATORS,
  MISC_OPERATORS,
  DIRECTIVES,
  EXAMPLES,
  getCompletionProvider,
} from '../src/reductstore/index';

describe('operators', () => {
  it('should export comparison operators', () => {
    expect(COMPARISON_OPERATORS).toBeDefined();
    expect(COMPARISON_OPERATORS.length).toBeGreaterThan(0);
    expect(COMPARISON_OPERATORS.find((op) => op.name === '$eq')).toBeDefined();
    expect(COMPARISON_OPERATORS.find((op) => op.name === '$gt')).toBeDefined();
  });

  it('should export logical operators', () => {
    expect(LOGICAL_OPERATORS).toBeDefined();
    expect(LOGICAL_OPERATORS.length).toBeGreaterThan(0);
    expect(LOGICAL_OPERATORS.find((op) => op.name === '$and')).toBeDefined();
    expect(LOGICAL_OPERATORS.find((op) => op.name === '$or')).toBeDefined();
  });

  it('should export string operators', () => {
    expect(STRING_OPERATORS).toBeDefined();
    expect(STRING_OPERATORS.length).toBeGreaterThan(0);
    expect(STRING_OPERATORS.find((op) => op.name === '$contains')).toBeDefined();
  });

  it('should export arithmetic operators', () => {
    expect(ARITHMETIC_OPERATORS).toBeDefined();
    expect(ARITHMETIC_OPERATORS.length).toBeGreaterThan(0);
    expect(ARITHMETIC_OPERATORS.find((op) => op.name === '$add')).toBeDefined();
  });

  it('should export misc operators', () => {
    expect(MISC_OPERATORS).toBeDefined();
    expect(MISC_OPERATORS.length).toBeGreaterThan(0);
    expect(MISC_OPERATORS.find((op) => op.name === '$has')).toBeDefined();
  });

  it('all operators should have required fields', () => {
    const allOperators = [
      ...COMPARISON_OPERATORS,
      ...LOGICAL_OPERATORS,
      ...STRING_OPERATORS,
      ...ARITHMETIC_OPERATORS,
      ...MISC_OPERATORS,
    ];

    allOperators.forEach((op) => {
      expect(op.name).toBeDefined();
      expect(op.name.startsWith('$')).toBe(true);
      expect(op.description).toBeDefined();
      expect(op.insertText).toBeDefined();
    });
  });
});

describe('directives', () => {
  it('should export directives', () => {
    expect(DIRECTIVES).toBeDefined();
    expect(DIRECTIVES.length).toBeGreaterThan(0);
  });

  it('all directives should have required fields', () => {
    DIRECTIVES.forEach((dir) => {
      expect(dir.name).toBeDefined();
      expect(dir.name.startsWith('#')).toBe(true);
      expect(dir.description).toBeDefined();
      expect(dir.insertText).toBeDefined();
    });
  });

  it('should include common directives', () => {
    expect(DIRECTIVES.find((d) => d.name === '#ctx_before')).toBeDefined();
    expect(DIRECTIVES.find((d) => d.name === '#batch_size')).toBeDefined();
  });
});

describe('examples', () => {
  it('should export examples', () => {
    expect(EXAMPLES).toBeDefined();
    expect(EXAMPLES.length).toBeGreaterThan(0);
  });

  it('all examples should have required fields', () => {
    EXAMPLES.forEach((ex) => {
      expect(ex.name).toBeDefined();
      expect(ex.description).toBeDefined();
      expect(ex.insertText).toBeDefined();
    });
  });

  it('example insertText should be valid JSON-like structure', () => {
    EXAMPLES.forEach((ex) => {
      expect(ex.insertText.includes('{')).toBe(true);
      expect(ex.insertText.includes('}')).toBe(true);
    });
  });
});

describe('getCompletionProvider', () => {
  it('should return a completion provider', () => {
    const provider = getCompletionProvider();
    expect(provider).toBeDefined();
    expect(provider.triggerCharacters).toBeDefined();
    expect(provider.provideCompletionItems).toBeDefined();
    expect(typeof provider.provideCompletionItems).toBe('function');
  });

  it('should have expected trigger characters', () => {
    const provider = getCompletionProvider();
    expect(provider.triggerCharacters).toContain('{');
    expect(provider.triggerCharacters).toContain('$');
    expect(provider.triggerCharacters).toContain('&');
    expect(provider.triggerCharacters).toContain('#');
  });
});
