# Ordinary simulation comparison — 2026-10-19

Scope: read-only comparison of resume baseline `37d8b63fe4756637ba25bf60e6ff08459ba96de6`
with retained-recovery deployment source `423fe45a`. No tuning, compilation, WASM
generation or simulation was performed for this inspection.

The current full routine fails TUNED/PICKED D33 at **1.10** (bar 1.15), and
automation-pays at **D18 48 vs 24 h; mean best 29.93 vs 30.14**. This inspection
finds no passive Vat change that would alter ordinary dayplayer simulation.
That supports a pre-existing regression inference; it does not replace an actual
baseline run or turn either failed gate into a pass.

## Exact source comparison

- All existing keys in `tuning/balance.json` are equal. The sole added object is
  `vat`, pricing the explicit Hurry command. Recovery remains `[600,14,28,1]`.
- The entire original `examples/dayplayer.rs` is unchanged. The current file
  only appends an opt-in diagnostic module after the original file. Original
  file and current file with that append removed have identical SHA-256:
  `63fc653d212b8225ff0c760ec1d7d4ba61a307981876e5eff08273f3bb45e416`.
- `examples/dayplayer_rows/mod.rs` is unchanged, SHA-256
  `b0e00587cd8a06d4a462d3a5a8be14d9aa75120ab72626b5e252ef4890ef9edb`.
- `src/offline.rs` is unchanged, SHA-256
  `b179b8f4fd4ccdb3b6a772374437693e47e203845ce2110b7958db1bb74239a9`.
- `src/tree.rs` is unchanged, SHA-256
  `8e0284920b4859d254784fb85b1aff2b5871dc7cfc9e539271355b3f1b31185e`.
- `src/forecast.rs` is unchanged, SHA-256
  `dfd39647c0482780568f15cb36a44b989085c7ec6c87aac95117d428666dd6b9`.

The core diff adds `persistent::hurry`, its explicit `Game::hurry_clone` entry
point, Hurry pricing, and read-only recovery/price wire fields. Recovery phase
copy changes from `recovering` to `reincarnating`; the Rust simulation does not
read that string. The ordinary dayplayer does not inspect these new fields or
call Hurry. The appended diagnostic is reached by the separate `picked_hurry`
example, not ordinary dayplayer `main`.

`engine.rs` changes only classify the literal `hurry clone` payment: exclusion
from night/day net, and inclusion in the sinks ledger category. This reason is
emitted only by the explicit Hurry command, so the changes are unreachable in
ordinary bots, workers and offline play. No recovery countdown, combat, worker,
automatic-send, package selection or standard bot policy changes were found.

## Historical evidence and limits

`docs/evidence/cut260/pacing.txt` and
`docs/evidence/cut273/pacing-pack.txt` report D33 **1.17 PASS**, with
automation-pays **48 vs 48 h; 30.04 vs 29.45 PASS**. These are earlier source
snapshots; they do not certify the later merged resume baseline.

`docs/evidence/cut264/verify-full-vat-only.log` records the rejected short-recovery
source at D33 **1.10 FAIL** and automation-pays **48 vs 24 h; 29.93 vs 30.32 FAIL**.
The retained-recovery Cut279 routine still fails both rows. That is useful
diagnosis, not proof that either recovery value passes.

No archived completed gate explicitly bound to exact baseline `37d8b63f` was
identified in this bounded inspection. Root is arranging an actual baseline
targeted check. Until its results are available, describe pre-existence as a
source-supported inference and preserve current full-routine failure status.
