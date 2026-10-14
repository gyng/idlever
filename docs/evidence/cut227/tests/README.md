# Cut227 — stale/failing client test groups

WASM fd56 (6813853 bytes, sha256 fd56ad4d…538f8c), headless via tools/browser.mjs.

| Group | Before | After | Cause / change |
| --- | --- | --- | --- |
| class-tree | FAIL :46 | PASS (alone, 6-group, 4/4 + 3/3 loaded 10-group runs) | Product: the Hero Hub (Cut220) showed `Skills unavailable` for an L1 hero, dropping Cut197 §4's truthful first milestone (`Class skills L3 · D8`); restored via `renderClassTreeMilestone`. Test: Hub `Change class` button replaces `.hero-class`; a sent run is home until its first turn (a327b8dd `persistent::away`), so the refusal fixture steps one turn; confirm taps wait for the overshooting j-sheet animation (loaded-suite lost tap: review open, confirm enabled, no feedback, nothing spent). |
| class-styles | FAIL :91 | PASS | Same send-then-step fix; `.hero-line` retired → Skills panel `.hero-hub-heading` overflow check; settled taps (one loaded-run failure before them). |
| hero-life | FAIL :306 | PASS 307 checks | Route buttons now open Hub sections: loadouts→gear, class→skills, legacy→attributes. |
| cut118 (exhaustive) | FAIL 1/19 | PASS 19 | 5f31e378 renamed the report action send→delve; the one-tap check still expected `send`. Ladder part already tests ladder.ts directly. |
| cut120 (exhaustive) | FAIL (3 assertions) | PASS 33 | Sheet: insure (Cut201) and heir (Cut219/220, replaced by the conditional temperament order) are retired; now asserted absent. Product: the report's `delve` was offered to a recovering hero although the camp gem refuses (`Recovering 60s`); `canSend` now mirrors the gem's recovery gate. Test: asserts no delve while recovering, lets the 60 s recovery pass, then measures the routine check-in (1 tap). Ladder door scoped through the task tracker fold. |
| gold-settlements (full suite) | FAIL (a2ab manifest) | PASS 564/24 | Default manifest now docs/evidence/cut226/settlements-inputs-fd56.json; cut222 a2ab and cut226 1b93 manifests kept as history. |

Routine `pnpm test`: 38/38 (client-smoke.log). fmt:check, lint, copy-lint, tsc pass.
