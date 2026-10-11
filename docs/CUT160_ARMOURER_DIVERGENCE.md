# Cut160 — locate the armourer horizon divergence

Prospective read-only diagnostic, 2026-10-11. Cut159 equipment projection is
verified, but unchanged-bar automation still fails27.96vs28.14. Cut158's same
seed2/day2 camp improves at24h yet loses at72h (D24vs26); the latter repeated
byte-identically. Do not assume an equipment heuristic bug from that alone.

Use existing armourer_check with the exact preserved earned seed2/day2 source
at8,24,36,48,60h, comparing actual public worker enabled/paused clones. No
grants, manual purchases, loadout, rule, other-worker, balance or actor changes.
Each elapsed comparison starts independently from the SAME source bytes;
these are not sliced continuations or a substitute for the failed gate.

Preserve complete reports/saves, first-send heroes, depth, deaths, run logs,
gold and vault, with source/runtime hashes. Find the earliest tested horizon
where depth worsens; use its retained death/equipment records and earlier
horizons to locate an actual divergence. Repeat any newly selected adverse
pair byte-for-byte before proposing a shipping change. If retained records
are insufficient, record that limit and gather earlier complete evidence.

Before adding a trace:8/24/36h favour enabled depth23/23/24 versus19/19/19;
48/60h lose24vs25. Repeat48h exactly. Add a read-only tool using production
run_offline_slice at1s with last=false, then0s last=true, to observe each new
send's hero at its first observed tick (<=10ticks; do not label it exact tick0).
Compare its COMPLETE final saved game byte-for-byte with an independently
cloned normal run_offline_counts48h branch. Only accept the trace as faithful
if both enabled/paused branches match. Do not change simulation code or report
timing to force parity; preserve any failed comparison and its outputs.

Original bars/harness adoption/full native+client acceptance and TWO fresh
complete independent blind ratings remain required for >=80. No deployment.

Trace extension: retain every completed record/exit and post-settlement vault.
For the observed enabled bank98 (elapsed112019s), save the actual state one
second before its exit. On a separate clone, call production tick until over
(at most10 ticks), then finish_run, preserving the pending eligible items and
auto_keep_plan before actual auto_keep. Compare retained vault and found fates
against the faithful transport record. This is an exit diagnostic, not whole
clock/save parity for the manually finished clone. No game choices or source
state change. A protected axe+1 / salvaged sword+2 can establish a retention
gap, but cannot by itself establish the cause of the original progression bar.

Status: independent8/24/36/48/60h comparisons completed. Depth enabled/paused:
23/19,23/19,24/19,24/25,24/25. Complete48h pair repeats byte-identically
(SHA9a84d980769cbb21c6957cd9a5e575c060a6e4c4a1f3da057a7efe5e77a6cc37).
Both full traced saved states equal normal48h offline results; extended trace
also exactly equals the initial trace outcomes. Completed exits73/79 captured.
First equipment divergence is run52: enabled axe+1, paused forged sword+2.
Enabled branch NEVER brings home an axe+2, so that suspected specific upgrade
loss is not established. Enabled banks98/119 do bring home sword+2 and salvage
it while retaining axe+1. Bank98 eligible pending capture confirms best_weapon,
one slot, brought axe+1 value40 and found sword+2 value45; plan keeps only the
axe. Focused replay vault/fates exactly equal faithful transport record.
This establishes a brought-item retention gap, not the cause of the full
automation gate failure. Build/focused clippy PASS. Raw outputs, logs, source
and runtime/artifact hashes: docs/evidence/cut160. No shipping change or score.
