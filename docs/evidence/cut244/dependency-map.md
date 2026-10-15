# Cut244 storage retirement dependency map

Read-only inventory before native removal. Contract: `docs/CUT244_STORAGE_API_RETIREMENT.md` and owner no-migration direction in Cut201. Client removal proceeds independently; native source/package remain pinned by `source-before-retirement.json`. `native-wasm-before.tar.gz` preserves exact pinned Rust source, tuning and 87de package bytes. The broader client hashes are historical at that pin; root separately retained its pre-edit client identity.

## Removal boundary

|Layer|Retired declarations and dependencies|Preserve|
|---|---|---|
|Game API, engine.rs|`set_keep_pref`3863, numeric `loadout`4020, `keep`6441/`keep_with_receipt`6451/`keep_settle`6470/`auto_keep`6572, `insure`6848, `sell_vault`6866; `exit_pending_wire`4881; storage choice helpers8044 onward|`choose`, `set_vault_pref`, supply preparation and starting-kit actions|
|Saved state|LineageState `vault`1445/`keep_pref`1484/`insured`1487; Game `loadout`3328/`pending_exit`3345; SentState `loadout`3443; PendingExit3049; Tree `worn`146|`next_vault_id` allocator; Run `brought` origin, `supplies`, `bought_leashes`, `converted_units`; permanent starting configuration; real bones and `value_claimed`|
|Send/exit|Auto-insure4301 and vault-instance transfer4360; death insured restoration5961, alive brought restoration5981; obsolete pending reset6007; mirror-shard vault consumption during breed6705|Automatic carry settlement5889 onward, prepared leash/supply return5984 onward, pet birth/lineage provenance, found quantity/privacy and bones creation|
|Wire|Lineage `vault`, `keep_pref`, `keep_auto`, `insured`, `selected_loadout`, `keep_salvaged`; StepResult `exit_pending`, ExitPending type; Stake `brought` and StakeItem type; RunClear `kept:Vec<String>`|Snapshot `vault_choice`, VaultChoice; cage order/`vault_pref`; all Gold `kept` numbers, RunBrief/ExitLine/Stake kept and Oath kept; SalvageRow report accounting|
|Orders|StandingOrders `keep`/`insure`; StandingSwitches `insure`; lib.rs set_orders validation/assignment; tree.rs SHAREABLE insure; bloodlines.rs copy_order insure|All eight other shared orders and their private/shared semantics|
|Snapshots/forecasts|SentState numeric loadout; simulation loadout copies, old insured/keep-pref cache inputs, pending resets; trace::camp_state copied pending path|Real sent lineage, capsule inputs, factual provenance, deterministic forecast cache behavior|
|Bridge|WASM exports loadout/auto_keep/keep/sell_vault/insure/set_keep_pref and adapters; regenerate native_dev/generated.rs using actual bridge generator|No handwritten generated API registry edits; current real starting-kit exports remain|

`retired-rust-callers-before.json` records 169 exact call sites in 41 Rust files, including examples/generated bridge and tests. This is a call inventory, not 169 independent gameplay paths. Root owns App/store/debug/history, TS Engine/types/adapter/proxy/fake, dead UI lookups and wire/client callers. Native owner owns core, Rust WASM exports, generated native API, native tests/examples and parity evidence. No renderer/menu/style edits are needed.

Two additional dead reporting dependencies require coordinated deletion: ReturnReport `found:Vec<InvItem>` reads Batch.found, whose only producer is old keep_settle; RunClear `kept` is produced solely by found fate `kept`. Neither is the current RunClear.found/ExitLine.found conversion history, and neither is legendary_kit. Preserve those current channels and real Gold.

## Test disposition

Historical raw test source is retained byte-exact in the source archive before removal. Do not silently disable a meaningful assertion.

- `tests_cut156::storage_still_offers_distinct_and_per_instance_choices` and `tests_cut157::manual_receipt_matches_existing_settlement_complete_save` solely test the superseded Keep contract. Remove from current compilation with explicit supersession in the retirement record; raw originals remain in the archive.
- Cut156 unknown-item preview/salvage test exercises retired pending-sheet naming, but privacy/quantity remains current: preserve it through real automatic pickup/exit assertions in economy_conversion_tests, not a replacement fake sheet.
- Cut156 retired-worker absence/hire checks remain meaningful. Remove vault preparation from its fixture while retaining zero retired worker/building assertions.
- Cut156 one/three-resident8h test injects pending Keep and grants Gold/workers. Replace its obsolete storage precondition while preserving exact whole/sliced/reloaded equality. Additionally the earned baseline below supplies independent real-state proof.
- In tests.rs and tests_cut30_pkg/tests_cut305/tests_runsui/tests_runclear/tests_cut119/tests_cut235, `auto_keep()` after a real exit is now a no-op. Remove that call only; retain underlying replay, pet, worker, save and accounting assertions. Classify explicit synthetic vault/insurance tests individually; do not remove surrounding active features.
- economy_conversion_tests keeps its once-only pickup valuation, secured checkpoint, Bank/Return/Death, physical loss, bones, prepared-item exclusion and mixed leash quantity tests. `run.brought` exclusion remains a real physical origin assertion even after the old vault transport is removed.
- economy_free_tests keeps Gold0 eligible preparation, exact refusal, shelf clearing/repeat conservation, three real delves, permanent Forge and Gunner payment tests. Its no-op auto_keep call is removable.
- Historical examples keep_check/keep_walk/loadout_check/armourer_trace/brought_upgrade_check must be marked superseded or moved outside current Cargo examples; do not keep compiling obsolete storage-only products. Current dayplayer/metrics/QA/absence/class/progression examples retain their substantive behavior and drop obsolete no-op settlement calls.

## Earned native baseline (complete, before removal)

`storage_retirement_baseline.rs` loads actual earned inputs without grants/direct state edits, records normalization, publicly selects each resident and attempts a send only when naturally home, then restores the selected resident. A refusal remains recorded. The single-resident source is Cut238 seed1's genuine first eligible home after death. Three-resident source is Cut219's actual purchased three-resident save; its historical source is retained rather than relabeled newly earned. Current native loading, prepared current save and exact public action results are separately retained.

Both baseline cases PASS exact full report and entire Session/replay JSON equality for real8h whole, sliced `[1,719,3600]` and reload-between-slices execution. One resident completes14runs; three residents complete3runs with all three legal public departures recorded. Inputs and source Session remain byte-identical. No synthetic pending exit, injected Gold, worker grant, forced run deletion or migration promise is used. `baseline/identity.json` binds helper, native binary, source archive, inputs and every output. Saved outputs are lossless gzip; raw outputs and retained executable remain under target/cut244.

Candidate comparison must enumerate only declared serialization deletions at typed paths (including nested sent/capsule lineages), preserve original baseline bytes and compare every remaining value. A gameplay mismatch blocks removal acceptance. Do not normalize arbitrary keys or regenerate expected values. Existing four current87de settlement inputs/after hashes remain independently pinned in docs/evidence/cut235/final/settlements-inputs-87de.json; replay them on native candidate and rebuilt real WASM before changing the default. No gate or candidate parity is claimed by this baseline.
