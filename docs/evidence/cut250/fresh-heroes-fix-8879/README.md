# Fresh Heroes disclosure — 2026-10-16

Engineering observation/verification, not player feedback. Applied4-file refinement after root's frozen400ade46routine ended40/41 (three ui:frame failures). Its original evidence is unchanged.

Native `town.home=false` already hid the whole footer. This patch removes the hidden Heroes DOM there; it does not correct previously visible native Heroes clutter. After actual House construction/hero arrival the existing first dock slot exposes one Heroes entry. Existing pre-House Journal/Settings remain. Actual pre-/post-Build320frames were opened and inspected: Build house/Free is clear before construction and the selected resident plus portrait dock action appear afterward.

The visible original fresh failure was the historical fake `systems=none` fixture without native Town data. Its fallback now exposes Heroes alongside an already-rendered earned command. This is presentational fallback disclosure, not a new native unlock. The specific House gate is implementation judgment applying the owner's uncluttered-opening principle; it supersedes the earlier inferred FreshHeroes clause.

- Initial corrected-source targeted run `targeted.log`: native first-plot PASS26.2s, ui:frame FAIL one newly exposed contradictory fresh accessibility assertion (it required Heroes and zero earned tiles). Raw state/log remains.
- Final test-only correction: `final-ui/targeted.log` PASS60checks/30.9s. Native first-plot was not repeated: all320/400/1440 original widths already passed actual free public Build busy/dedup→resident arrival→one visible Heroes→roster/Escape with exact save. No substantive construction/geometry checks were removed.
- `native-frames/first-plot-proof.json` retains each actual served WASM SHA, width/height, native pre-state and selected owner/name identity. Six original-width viewport images retained. Their900px heights are existing regression geometry, not a new typical-phone art/layout review.
- TypeScript, Oxlint, scoped format and copy lint pass (`*-final.log`). Initial static logs retained too. Both browser phases have source-before/after snapshots; exact source/runtime unchanged within each phase. Final phase differs only in the stale fresh test assertion; production source remained unchanged.

Only production file is `web/src/ui/camp.ts`; tests `web/tests/ui.mjs`, `web/tests/first-plot.mjs`; contract `docs/CUT250_COMPACT_HOME_CHROME.md`. No native/fake/renderer/package edits, no density-budget increase. The15-function Home failure and broad menu/R4/R7/fun obligations remain open. Revalidate on Home disclosure/dock/controller changes, native House/arrival wire changes, test-fixture evolution, or a new WASM package. No performance claim.
