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

## License

MIT
