# Cut291 — Throw refusal explanation

The execution permission is unchanged: Rogue's natural Throw or the general
Throw unlock. A failed row without permission now says `not learned`, with
`learn Throw first`; it previously misleadingly said `no line`.

Four actual earned Cut290 parents (gas/pack × missing/purchased permission),
exactly50 ticks each, were frozen before the core edit. Complete events and
saves before/after match after only replacing the new reason/gloss strings and
map keys. Both purchased controls are byte-exact. Locked gas has five corrected
refusals. Four public-WASM continuations match native complete save bytes and
events. These are bounded deterministic checks, not population balance evidence.

Run `python3 docs/evidence/cut291/verify.py` from repo root (Python3 and zstd).
It checks all87 archived receipts, source/harness/contract hashes, red/green test
logs, four whole-save/event comparisons and four complete native/WASM pairs.
Raw archive578024 bytes /146840537 logical raw bytes; manifest retains all hashes.
The producer's0.880s compression timing is not a campaign speedup claim.

Workspace tests:1100 passed,6 ignored; warnings-denied workspace/all-target Clippy
passed. Five focused regressions were red on old core (2 pass/3 assertion fails),
then5/5 green. Web format/lint/types/copy checks passed. Validation logs are in
`validation/`; `identity.json` pins native, source, parent and WASM identities.

Native settlement replay preserves Gold, ledger, ExitLine and all expected
outputs on4/4 cases. Three entire after-saves are unchanged. The fourth changes
only `lineage.row_stats[8][1].blocked`: no line363 becomes no line273 plus not
learned90. `amend_settlement.py` asserts this exact reclassification and every
other field before replacing that single fixture; `settlement-reason-diff.json`
records it. No action totals or gameplay fields are adjusted. Current default
manifest is `settlements-inputs-fb23.json`; WASM7142362 bytes,
SHA256fb23bbaa6fe611bff3d2147a95965c28de49bbbdddb04439dff0659922792176.

Two browser-launch failures occurred before any browser proof: first the runner
was invoked from repo root rather than web/, then sandbox denied its local
listen. Both logs are retained. The corrected host run uses the headless harness.
Corrected run ended0:564/564 checks across24 cases; actual served package matches
fb23. `browser-settlements.json` and `validation.json` retain results and log hashes.
All owned jobs are terminal.

No balance profile, held W2/recovery proposal, Guide gap, Cut289 rejected AI,
content, release or deployment change. Full gates, exhaustive audit and independent
fun acceptance remain outside this diagnostic fix.
