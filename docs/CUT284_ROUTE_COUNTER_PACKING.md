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
Freeze source/native identities. No core rule changes while the Cut283 study
runs on its frozen runtime.

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
