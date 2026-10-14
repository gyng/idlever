# Cut222 — remove recurring wishes

Source audit and implementation contract; not gameplay acceptance.
Addresses queue13 and supports the build-first, lived-in base direction.

## Finding

`feats.rs::wish` picks one of five labels using a tagged seed: lantern, pet,
rest, song or map. `grant_wish` subtracts half a Forge unit, adds2 Legacy
(3 for map), and schedules another offer one game day later. All five use
the same purchase operation. Song does not play music; pet does not grant a
companion; rest does not recover a hero; lantern does not change lighting.

`web/src/ui/feats.ts::wishChip` shows a label and an unlabeled `+2`, then uses
a second tap to confirm the price. The currency name appears only in a title
tooltip. Success gives a generic toast. This explains the owner's confusion.
These are recurring currency purchases with decorative names, not build choices
or actual hero activities. Automatic spending would preserve the same chore
and remove the player's spending decision.

## Change

Retire new wish offers, their purchases and the recurring camp chip. Preserve
previously earned Legacy and spent-Gold history exactly. Historical report/news
entries remain readable. Remove the active grantWish bridge/client operation;
no old-brand or API compatibility is required by the owner.

Do not automatically award replacement Legacy or spend Gold. Existing actual
delves, achievements and paid upgrade systems remain their own sources and
sinks. Measure the retirement against the current baseline rather than silently
changing their rewards to compensate. Core's documented IDLE policy does not
grant wishes; prove that its state and timing are unchanged.

Future base activities may include reading, resting or caring for a real pet,
but their display must follow actual hero state. They must not restore a daily
paid click under another name. Persistent needs/base routines remain separate
work with their own mechanics and evidence.

## Acceptance

1. A real save with a waiting song exposes no purchase after the change. Opening
   camp, Journal and Hero preserves exact Gold, Legacy, combat RNG and paid kit.
2. Saves with0,1 and5 previously granted wishes retain their earned points and
   ledger. Repeated reads and24h whole/sliced/reloaded absences produce no new
   wish, automatic spending or replacement reward.
3. Current source contains no reachable grantWish operation or camp wish chip.
   Retired historical report entries still render without claiming that the
   song played, a pet appeared or recovery occurred.
4. Compare actual public-action sixteen-seed IDLE milestone timing against the
   matching baseline. Separately quantify the maximum optional daily Legacy
   removed and its impact on an engaging policy; do not use IDLE proof alone
   to claim all balance is unchanged.
5. Real-WASM320/400/1440 camp layouts, normal and200% text, retain seek/trial
   controls and keyboard focus without a blank recurring-wish placeholder.
   Record a settled screenshot and exact engine/source identities.

Coordinate after Cut219 source freeze: both cuts touch `feats.rs` and its client.
This contract does not retire actual pets, rest, music settings or lantern art.

## Read-only bot and bridge impact audit (2026-10-14)

`examples/dayplayer.rs` and `examples/metrics.rs` do not call `grant_wish`
or read a waiting wish as a bot action. The source-wide native example search
finds only the generated native bridge operation; the actual gameplay call
outside the bridge is the dedicated Cut118 test. Existing IDLE/PICKED/TUNED/
RANDOM action protocols therefore need no replacement wish action. Do not
change their check-ins, budgets or purchases while retiring this feature.
This source finding predicts no lost bot purchase; actual matched pacing proof
is still required and has not run for Cut222.

Current reachable removal surface is `feats.rs::wish/grant_wish` and its wire
assembly, `lib.rs::Game::grant_wish`, the WASM wrapper, `types.ts`, `wasm.ts`,
`proxy.ts`, the fake prototype operation, and `ui/feats.ts::wishChip`. Regenerate
`examples/native_dev/generated.rs` and `web/src/engine/native-api.json` from the
bridge source; do not hand-edit generated method inventories. `web/tests/
cut118b.mjs` currently stubs and clicks the chip, and inventories `grantWish`.
Replace the retired purchase journey with absence/history/read-purity proof;
do not leave an optional unreachable method merely to satisfy that test.

The removed optional reward is exactly 2 Legacy per purchased wish, or 3 for
map. Cooldown is one game day after an actual purchase, not an automatic daily
reward. Thus a continuously eligible resident could buy at most one per day:
2–3 points per purchase, at most 28–42 points across 14 daily purchases per
resident. `town_from` shares Gold but does not copy `feats`, so separate
residents have separate wish clocks/rewards; a three-resident upper bound is
84–126 points if all are eligible and funded for those 14 purchases each. This
is an upper bound for a schedule, not observed income or a promise that all
players can afford it. Each purchase costs `kit::unit(best_depth) / 2` Gold,
truncated as Rust integer division, using the existing spending-purse check.
Report removed Legacy and avoided actual spending separately in any engaging
comparison; do not invent replacement rewards or infer unchanged engaging
balance from IDLE's lack of a call.

`FeatsState.wishes` and `wish_at` can remain inert historical save fields if
that preserves already-earned totals and chronology. Their presence must not
schedule new offers or mutators. Existing news/report history remains readable
as a historical Legacy purchase; it must not imply a song actually played,
a pet was added or recovery happened. UI seek, trials, Return picks and actual
music settings are separate and must retain their own actions.

## Preserved genuine baseline

The pre-retirement source archive, native dayplayer and WASM identities are
recorded under `docs/evidence/cut222/core/`. The preserved WASM is6698072bytes,
SHA256 `66b8a12ef9b314138d82125bd2f944583fb56d40f85ba4bc8186e7f0425b3171`.
`wish-inputs.json` records six public-action saved Sessions:0,1 and5 historical
purchases, a waiting song after8 purchases, and immediate post-purchase1/5
variants retaining pending historical news. They use an actual paid resident's
first D4 death, not granted currency or rewritten counters.

The first five actual purchases spent500 Gold and awarded12 Legacy: map3,
lantern2, map3, rest2, pet2. These were Legacy purchases; the labels did not
create those purported activities or companions. A later waiting song is
recorded after8 purchases,800 Gold spent and19 Legacy awarded. Retirement
preserves the resulting balances; it does not refund spending or remove points.

The original sixteen-seed IDLE baseline passed the five named depth, stall,
Gold and King rows on runtime `src8a178f09639f4521`. All sixteen complete raw
fortnight results are preserved separately from the fail-fast D23 bound output.
All reached D8 on day1 and D23 by day12; median D23 was4.333days, with Gold on
14/14 days and no King kill. Post-retirement matched proof is still pending.

The first retirement history test also exposed a preexisting multihero
transport defect: waiting whole24h and three8h slices disagreed only on closed
day income and oath prices. Both affected production files exactly match the
preserved baseline source. The raw failed run and compact field-level diff
are retained. Full saved-state parity remains required; this finding is not
permission to strip day-accounting fields from the comparison.

The bounded correction closes oath income at the committed `advance` clock
and caps all-waiting Session skips at each actual day boundary. No extra
combat tick, currency reward or wish compensation is added. Three empty days
therefore close three days rather than carrying an old income into the final
day. A lawful public send immediately before midnight is tested against100ms
transport slices with reloads, as well as exact zero elapsed advance purity.

This correction can change a paid choice. The genuinely earned owner1 world's
whole24h result previously retained a3510 Gold oath price while the same
absence split into8h slices showed4250, based on16996 Gold in the last closed
day. The corrected whole result agrees with the slices. Its depth28 minimum
price is800 after intervening empty days. Test the actual public oath debit
separately; no unchanged engaging-price claim follows from unchanged IDLE.

## Core acceptance result

Final-source scoped tests pass: six genuinely paid-history24h whole/sliced/
reloaded absences, exact reports/read/Gold/Legacy/RNG/history, three real waiting
days, zero elapsed advance, and a publicly sent actor crossing midnight.
The existing oath day lapse and paid Gold sink tests also pass. Default
workspace/all-target Clippy passes, including both diagnostic examples.
`retirement-checks-final.json` records the actual public3510→4250 oath debits;
this740 Gold change corrects the whole/sliced disagreement, not wish income.

The fresh targeted five-row sixteen-seed IDLE run passes in113s. Every key of
every actual full-fortnight result is bit-identical between baseline runtime
`src8a178f09639f4521` and retired runtime `src21b17017614e3c25`, including
milestone times, day Gold, stalls and King outcomes. The immutable raw results
and field comparison are in `idle-matched-final.json` and both result folders.
This closes the declared matched IDLE scope, not the full balance gate or an
unchanged-engaging-policy claim.

The accepted Cut223 transaction fixtures are replayed on current source with
unchanged public operations. New `docs/evidence/cut222/settlements-inputs.json`
pins WASM6688669bytes,
SHA256 `a2ab9963be34bb7bf3dfa23f5acb82d625fe24804ce68c76c996997939cafffb`.
Original Gold, ledger, named fetch and ExitLine receipts remain exact. The
three one-tick after-saves are unchanged; the actual8h multihero save has
canonical day-accounting and pass-lock chronology differences. Their exact
paths are recorded rather than excluded from native/WASM equality. The old
Cut223 manifest and accepted66b8 proofs remain unchanged. Current browser
acceptance uses the new golden states; it is separate from this native result.

## Browser acceptance result (2026-10-14, resumed session)

Served WASM `a2ab…fffb` throughout. `wish-retirement` passes260 checks,
6 genuine cases,6 waiting-song layouts (320/400/1440 at normal and200% text),
with whole/sliced/reloaded full-save equality and exact native24h after-saves:
`docs/evidence/cut222/ui/actual-a2ab-fifth/`. The fourth attempt's failure was
a harness defect (news compared with key-order-sensitive `JSON.stringify`;
the same objects already passed `deepEqual`); it is preserved.

The multihero pass-lock "chronology difference" above was not a game change.
`gold_settlement_repin.rs` omitted `chronicle::use_shipping_words()`, which the
original Cut223 exporter calls so native chronicle word choice matches WASM's
32-bit `usize`. With it, native reproduces the WASM save exactly; Gold, ledgers
and the three one-tick saves are byte-identical to before. Superseded goldens:
`core/settlements-repinned-native-words-superseded/`. `gold-settlements` now
passes564 checks/24 cases (`settlements-shipping-words.log`).

Migrated client journeys pass: `ui:frame` (60), `screens` (59),
`debug-export`, `class-switch`, `post-clear-town`. Stale assertions updated to
committed UI: Hero Hub close stud, Delve gem label, 1px tile press (e46f4a0e),
Hub prepare/remove instead of the unreachable supplies panel, a built Forge in
the debug fixture (Cut219 staging). The fake engine now prices preparation at
$0 like Rust (Cut191). Routine client subset passes38/38; native workspace
914 passed/6 ignored; default Clippy passes. `routine-keep` (Cut156, requires
an autoKeep call Cut206 retired) moved to exhaustive-only beside `ui:keep`;
`death-fix-discovery` pins updated to current Rust ($0 free scroll fix,
past_to0.875). Both failed identically before Cut222 (`cut220/critical-pre222`).

Item5 settled private-GPU captures pass on the genuine waiting-song save at
320/400/1440 × normal/200% text: no wish control, no overflow, read-stable
save, every served body `a2ab…`: `docs/evidence/cut222/ui/gpu-camp-a2ab/`.
Still open: acceptance item4's engaging-policy comparison.
