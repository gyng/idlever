# Cut201 — core retirement checkpoint

The earned baseline was captured before runtime edits at source checkpoint
`774a68bc173f4ef673460dee3d8c9269a457c80e`, using the new diagnostic example
`retirement_pacing`. Fresh towns built their house, played actual delves,
constructed only ready plots and hired Scout only when eligible and affordable.
No Gold, facts, unlocks, workers or outcomes were granted.

The time estimate follows the existing dayplayer model: run ticks/10 at4×,
25seconds at camp, and5seconds for each actual construction/hire action. It is
an active-session estimate, not a measured human playtest or CPU benchmark.

All8 baseline seeds hired Scout after3 manual delves, in6.18–11.05 modeled
minutes. All met the existing15min/5-delve bound. Their first8h autonomous
absence completed15–17 runs. A first permanent kit upgrade became affordable
on delve2 or3 for6 seeds; seeds11/13 did not reach that price before Scout.

After retirement, all8 still took3 manual delves and completed the same number
of autonomous runs. First affordable-kit timing stayed identical. Each Scout
time fell by exactly5seconds: one obsolete Storehouse construction tap was
removed. No unlock delay, stat change, currency grant or balance threshold
change was introduced. Exact comparisons are in `earned-pacing-comparison.json`.

Raw saves, observations and logs are preserved in
[raw-earned-pacing.tar.gz](raw-earned-pacing.tar.gz), with original `before/`,
`after/` and `earned-plots/` paths. Catalogue IDs in those observations include locked offers; they are
not proof that every listed choice was simultaneously available. Worker
readiness and kit affordability are recorded separately.

Core changes remove Storehouse construction/reveal/stage offers, keeper and
armourer hire/rank nodes, their equipment/insurance callbacks, and four storage
upgrade purchases. Forecasts no longer project an armourer's changes. Remaining
plots are manual. Quartermaster, Scout, apprentice and the other useful workers
retain their roles. `bones_only` is removed from current ascension offers because
its no-storage effect would no longer distinguish it from ordinary play.

Inactive vault-instance fields/APIs remain until coordinated Rust/WASM/TS API
cleanup. They are not a permanent named-kit API. Full API retirement and deeper
saved kits are not claimed by this checkpoint; no compatibility migration was
implemented.

Strict native fixtures verify no retired offers or purchases, no mutation on
refused retired actions, manual remaining construction and no retired wire
building/worker display. Conversion, free preparation and catalogue checks
passed19/19; associated worker/projection/native contracts passed54/54.

The first workspace audit passed840 tests and failed1 obsolete assertion:
`a_gold_buy_spends_gold_on_rows_and_automations` tried to price a removed `vault2`
offer. Its replacement asserts that the offer is absent and retains paid-row,
automation, refusal and serialization assertions. The original failure is in
[native-all-first.log](native-all-first.log); the final audit and Clippy logs are
[native-all-final.log](native-all-final.log) and [clippy-final.log](clippy-final.log).
The final
workspace audit passed841 tests, failed0 and ignored6 in70.14seconds. Workspace
Clippy with all targets and warnings denied passed. Both processes exited0.

The optional `--finish-plots` diagnostic performs actual eligible construction
after the8h absence. `earned-plots/seed-1-final.json` and `seed-3-final.json`
contain genuinely earned, manually built Forge, Kennel and Savings. They are
available for the renderer checkpoint, without legacy grants.

[archive-manifest.json](archive-manifest.json) records byte counts and SHA256
for all126 raw archived files and the five copied validation logs. Every
archived file was read back and matched against its original bytes. The
archive is1,590,405bytes. It preserves failed-audit evidence as well as passing
results. The quiet Clippy log is empty; its successful exit status is recorded
from the terminal result rather than inferred from the empty file.

The manifest records the baseline commit, current and baseline core-source
digests, current harness hash, compiler identity and local compiled-artifact
hashes. Source digests include native tests and are not the gates' compiled
runtime key. No separate baseline compiled artifact was retained. The original
baseline harness was not separately saved: the explicitly labelled
reconstruction removes only the later optional `--finish-plots` block and its
output field. This distinction prevents a reconstructed hash from being
presented as a contemporaneous measurement.

This evidence does not certify fortnight balance, the full work queue, a
release deployment or the separate fun-rating goal.
