export const SQL_EXAMPLES = [
  {
    name: 'Select all columns',
    insertText: 'SELECT * FROM ENTRY()',
    description: 'Default query when no SQL is specified',
  },
  {
    name: 'Filter CSV columns without headers',
    insertText: 'SELECT column_0, column_2, column_3 FROM ENTRY() WHERE column_0 < 10',
    description: 'Select and filter CSV columns exposed as column_0, column_1, ...',
  },
  {
    name: 'Filter CSV column with header',
    insertText: 'SELECT e FROM ENTRY() WHERE e < 10',
    description: 'Select and filter a named CSV column (csv.has_headers: true)',
  },
  {
    name: 'Nested field with alias',
    insertText:
      "SELECT temp.status AS status, temp.value AS value FROM ENTRY() WHERE temp.status = 'ok'",
    description: 'Select nested JSON/Parquet fields with dotted paths and aliases',
  },
];
