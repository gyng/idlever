# Cut188 — default formatting and lint

Owner request, 2026-10-12: replace the README slogan; set up Oxfmt, Oxlint and
Clippy with defaults; fix issues, commit and push. Finish this before tagging
the first alpha from Cut187.

## Contract

- Oxfmt and Oxlint are locked development dependencies in the existing web
  package. Use default formatting and lint rules; configure only file ignores.
- Format maintained client source, tests, tooling, build configuration, workflow
  and README. Preserve generated WASM/native metadata and raw save fixtures.
- Apply safe lint fixes, then resolve remaining diagnostics without changing
  gameplay or weakening assertions. Preserve collection snapshots where the
  body mutates the collection. ANSI stripping intentionally matches control
  characters, with one documented local suppression.
- Formatting check: zero changed files. Oxlint: zero errors and warnings.
- Keep the existing default Clippy rules with warnings denied. Enforce formatter
  and linter in quick/full verification and CI before expensive engine builds.
- Typecheck, copy lint, tooling tests, native regression and all125 current
  client groups pass on the final source. Historical wider audits remain opt-in.

## Results

Formatting, default Oxlint, TypeScript, copy lint and actionlint pass. The first
lint scan found177 diagnostics; all are resolved. Full final validation is in
progress. Oxfmt uses its defaults. The README description is now factual:
"An idle roguelike with automatic combat and a town to build."
