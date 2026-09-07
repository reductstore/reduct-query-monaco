export const SQL_COMPARISON_OPERATORS = [
  { name: '=', description: 'Equal to', insertText: '=' },
  { name: '!=', description: 'Not equal to', insertText: '!=' },
  { name: '<>', description: 'Not equal to', insertText: '<>' },
  { name: '<', description: 'Less than', insertText: '<' },
  { name: '>', description: 'Greater than', insertText: '>' },
  { name: '<=', description: 'Less than or equal to', insertText: '<=' },
  { name: '>=', description: 'Greater than or equal to', insertText: '>=' },
];

export const SQL_LOGICAL_OPERATORS = [
  { name: 'AND', description: 'Both conditions must be true', insertText: 'AND ' },
  { name: 'OR', description: 'Either condition must be true', insertText: 'OR ' },
  { name: 'NOT', description: 'Negate a condition', insertText: 'NOT ' },
];

export const SQL_FILTER_OPERATORS = [
  { name: 'BETWEEN', description: 'Value is within a range', insertText: 'BETWEEN ' },
  { name: 'IN', description: 'Value is in a list', insertText: 'IN' },
  { name: 'LIKE', description: 'String matches a pattern', insertText: 'LIKE ' },
  { name: 'ILIKE', description: 'Case-insensitive string pattern match', insertText: 'ILIKE ' },
  { name: 'IS NULL', description: 'Value is null', insertText: 'IS NULL' },
  { name: 'IS NOT NULL', description: 'Value is not null', insertText: 'IS NOT NULL' },
];
