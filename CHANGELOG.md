# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Monaco completion provider for the SQL dialect used by the ReductSelect extension (`getSqlCompletionProvider`)
- SQL keywords (`SELECT`, `FROM`, `WHERE`, `AS`), the `ENTRY()` table function, and the documented comparison operators (`=`, `<`, `>`)

## [1.0.1] - 2026-01-10

### Added

- CommonJS build output for compatibility with legacy bundlers

## [1.0.0] - 2026-01-10

### Added

- Initial release
- Monaco completion provider for ReductStore query language
- Comparison operators (`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`)
- Logical operators (`$and`, `$or`, `$not`, `$in`, `$nin`, etc.)
- String operators (`$contains`, `$starts_with`, `$ends_with`)
- Arithmetic operators (`$add`, `$sub`, `$mult`, `$div`, `$rem`, `$abs`)
- Miscellaneous operators (`$has`, `$cast`, `$ref`, `$timestamp`)
- Query directives (`#ctx_before`, `#ctx_after`, `#batch_size`, etc.)
- Complete query examples for quick starts
- ESM-only build for modern browser tooling
