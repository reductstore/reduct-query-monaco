# reduct-query-monaco

Monaco Editor completion provider and helpers for the [ReductStore](https://www.reduct.store/) query language.

[![npm version](https://img.shields.io/npm/v/@reductstore/reduct-query-monaco.svg)](https://www.npmjs.com/package/@reductstore/reduct-query-monaco)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @reductstore/reduct-query-monaco monaco-editor
```

## Usage

### Register the completion provider

```typescript
import * as monaco from 'monaco-editor';
import { getCompletionProvider } from '@reductstore/reduct-query-monaco';

// Register the language (if not using JSON)
monaco.languages.register({ id: 'reduct-query' });

// Register the completion provider
monaco.languages.registerCompletionItemProvider('reduct-query', getCompletionProvider());
```

### Use with Monaco Editor

```typescript
const editor = monaco.editor.create(document.getElementById('editor'), {
  value: '',
  language: 'reduct-query',
  automaticLayout: true,
});
```

## Exports

### `getCompletionProvider()`

Returns a Monaco completion provider with intelligent autocomplete for:

- Query examples (at document start)
- Operators (`$eq`, `$gt`, `$and`, `$or`, etc.)
- Directives (`#ctx_before`, `#select_labels`, etc.)
- Label references (`&label`)

### Operators

| Export                 | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `COMPARISON_OPERATORS` | `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`      |
| `LOGICAL_OPERATORS`    | `$and`, `$or`, `$not`, `$in`, `$nin`, etc.      |
| `STRING_OPERATORS`     | `$contains`, `$starts_with`, `$ends_with`       |
| `ARITHMETIC_OPERATORS` | `$add`, `$sub`, `$mult`, `$div`, `$rem`, `$abs` |
| `MISC_OPERATORS`       | `$has`, `$cast`, `$ref`, `$timestamp`           |

### Other

| Export       | Description                                        |
| ------------ | -------------------------------------------------- |
| `DIRECTIVES` | Query directives like `#ctx_before`, `#batch_size` |
| `EXAMPLES`   | Complete query examples for quick starts           |

## Example Query

```json
{
  "&label": { "$eq": "value" },
  "$limit": 100,
  "#ctx_before": 5
}
```

## SQL completion provider (ReductSelect extension)

The [ReductSelect extension](https://www.reduct.store/docs/extensions/official/select-ext) accepts a SQL query in the `sql` field of `#ext.select`. `getSqlCompletionProvider()` provides autocomplete for that dialect.

```typescript
import * as monaco from 'monaco-editor';
import { getSqlCompletionProvider } from '@reductstore/reduct-query-monaco';

// Registered on Monaco's built-in "sql" language so the editor also gets
// its built-in SQL syntax highlighting
monaco.languages.registerCompletionItemProvider('sql', getSqlCompletionProvider());
```

The general SQL grammar (clauses, operators) follows [Apache DataFusion's SQL dialect](https://datafusion.apache.org/user-guide/sql/index.html), since that's the engine ReductSelect runs on. `ENTRY()` and dotted paths for nested fields (`temp.status`) are ReductStore-specific and follow the [ReductSelect extension docs](https://www.reduct.store/docs/extensions/official/select-ext) instead.

This first pass covers the full clause grammar (`WITH`, `SELECT`/`DISTINCT`, `FROM`, joins, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`/`OFFSET`, set operations) and the full operator set (comparison, logical, and filter operators). A curated catalog of common SQL functions (aggregates, string, date, etc.) is planned as a follow-up rather than modeled here, since the scope of that catalog is still being decided.

| Export                     | Description                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `SQL_CLAUSES`              | `WITH`, `SELECT`, `DISTINCT`, `FROM`, join variants, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`, `AS`, set operations |
| `SQL_FUNCTIONS`            | `ENTRY()` (ReductStore-specific)                                                                                                        |
| `SQL_COMPARISON_OPERATORS` | `=`, `!=`, `<>`, `<`, `>`, `<=`, `>=`                                                                                                   |
| `SQL_LOGICAL_OPERATORS`    | `AND`, `OR`, `NOT`                                                                                                                      |
| `SQL_FILTER_OPERATORS`     | `BETWEEN`, `IN`, `LIKE`, `ILIKE`, `IS NULL`, `IS NOT NULL`                                                                              |

## Release

Release from a clean `main` checkout:

1. Move the relevant entries from `CHANGELOG.md`'s `Unreleased` section to the new version, then commit that change.
2. Verify the release candidate:

   ```bash
   npm run fmt:check && npm test
   ```

3. Bump the version. Use `patch` for fixes, `minor` for backward-compatible features, or `major` for breaking changes:

   ```bash
   npm version patch
   ```

   This updates the package manifests, commits the bump, and creates a `vX.Y.Z` tag.

4. Push the commit and its exact new tag:

   ```bash
   git push origin main
   git push origin vX.Y.Z
   ```

5. Publish the tag's checkout:

   ```bash
   npm publish
   ```

   Complete npm's browser authentication if prompted. Do not pass `--access public`.

## License

MIT
