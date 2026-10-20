# Cut284 — route-aware drilled counter packing

Backlog mechanic review during Cut282 pen diagnosis finds different reach tests:
`packages::quartermaster` uses canonical boss depths for drills, but the active
route for the same counter written in the pen. There are13 valid routes and
both the Mother/fire and Queen/silence counters can move between bands.

## Reproduction first

Use a controlled native diagnostic (explicit fixture, not earned-play evidence)
over all13 valid routes, both item counters and drilled versus pen-authored
versions. Test just outside/inside reach (record at actual boss depth−3/−2),
crossing the boss from the closest valid lit earlier waystone at record33, and
skipping it from the next later waystone when one exists. Mark counter items
identified, use public legal start selection after controlled waystone setup,
and derive expected packing from the actual route's boss depth. Preserve all
cells, not just failures; assert the pen control matches and report drill gaps.
Freeze source/native identities. The production fix uses a separate runtime;
Cut283 continues on its immutable old executable and remains historical evidence.

## Fix and acceptance after reproduction

Use the active route for drilled reach/skip checks, retaining revocation,
identification, inventory reservation and player-authored policy semantics.
Require zero mismatches on the route matrix, unchanged base-route results,
tests for missing identification/revoked policy, actual restock/send inventory
on representative earlier/later moved bosses, and save/load plus sliced/full
offline parity where affected. Focused Rust tests/Clippy, rebuilt WASM and
relevant settlement/bridge checks apply to any production change. Statistical
and catalog evidence from the previous runtime stays historical; do not adopt
a balance profile on obsolete source evidence. No new items, policy rows,
automatic pen edits or deployment are included.

Execution amendment2026-10-20: the frozen study executable and inputs are
self-contained, so waiting for its slow held-out simulations needlessly delays
this independently reproduced fix. Change current code and validate it in the
isolated build while the old study finishes. Do not alter that study's analysis,
profile, seed schedule or claims. Its report must retain its old runtime identity
and cannot authorize a new default after this production change; any adoption
needs fresh current-runtime evidence. Original reproduction contract bytes are
preserved in `evidence/cut284/frozen-contract.md`.

## Complete — 2026-10-20

Drilled reach/skip now uses the active route, matching pen counters. The unchanged
198-cell diagnostic reports0 mismatches: exactly32 faulty drill cells corrected,
166 other cells unchanged, including every base-route and pen control. Three
new Rust regression tests cover99 drilled cases plus identification/revocation,
six actual saved/send inventories and two moved-counter in-flight8h Sessions
with exact whole/sliced/reloaded reports and saves.

Workspace1095 tests pass/6 ignored; all-target Clippy warnings-denied, formatting,
lint, types and copy checks pass. Fast WASM7547021 bytes,
SHA2561f9206e6352466211866e9c4f1d5fe36aa4b9826a17fabbd5c4542f299e24c63.
Six public-WASM sends carry the correct counters and two heals; exact in-flight
reloads pass. Native saved Gold/ledger/ExitLine, expected outcomes and after-saves
are unchanged4/4; real-WASM browser settlement564 checks/24 cases pass. Default
manifest is `evidence/cut284/settlements-inputs-1f92.json`.

Guide gap remains4; no held upgrade, recovery or new balance default changes.
No full gate, rare-event audit, independent fun acceptance or deployment is
claimed. The two inherited base-route balance failures remain open. Cut283
continues independently on its old immutable executable and cannot authorize
adoption on this current runtime. Evidence is under `docs/evidence/cut284/`.
