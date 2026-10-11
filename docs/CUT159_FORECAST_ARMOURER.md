# Cut159 — forecast the armourer's existing pack

Prospective contract, 2026-10-11. Cut158 demonstrates three earned camps where
actual next-send weapon is stored axe+2/+1/+1 but the production forecast
helper uses forged sword+2/plain/+2. Earlier three camps with manually selected
axe match. Do not mistake this equipment mismatch for a proved cause of the
failed away-worker progression row.

Implementation: extract the EXISTING armourer selection and insurance marking
into shared code. Real workers retain their ordering, act count, selection and
payments. Fresh forecast sends project only that pack into their simulation
clone before start_run, using existing ownership/pause, literal/bones-only,
death-ledger/rank gates, item worth and chosen-loadout behavior. Do not run
other simulated worker training, building, shopping, guide or town actions.
Add the projected selection/insurance to forecast cache identity. Historical
rules stay literal; direct death replay/sim-clone/start_run behavior stays as
before. Preview must not mutate the real game or make a manual gear decision.

Required checks:

1. All six Cut158 actual/forecast first kits match after the change; complete
   actual-send saves remain byte-identical to the preserved baseline. Source
   bytes and real game save unchanged by previews.
2. Explicit owned/paused/unowned, rank/ledger, literal/bones-only, weaker gear,
   weapon/armour, manual chosen ids and insurance fixtures compare preview
   equipment to actual send. No extra real-worker acts, payments or stats.
3. Source/cache identity differs when projected pack/insurance changes; cached
   vs fresh, sequential vs threaded and prefix vs complete panels agree.
   Historical rules/death replay contexts remain intact.
4. Original unchanged-bar diagnostic outpace/porter/scout/automation-pays on
   two original seeds, preserving terminal failures. This is not full gate or
   harness adoption. If still failed, retain it and investigate separately.
5. Quick Rust/tooling/types/copy, all-target clippy, realWASM rebuild, webbuild
   and relevant existing forecast/client regressions pass. Preserve failures,
   source/runtime identities and observations with hashes.

Full current native/client acceptance, immutable release freeze and TWO fresh
complete independent blind ratings remain required for >=80. No deployment.

Verified component: all six earned equipment comparisons match and complete
actual-send saves equal preserved baseline. Twelve fixtures/caches/threaded
prefix checksPASS. Quick804Rust/6ignored + tooling14/types/copy2354zero
PASS145s; clippy/buildPASS; rebuilt realWASM6369495B. Existing focused5client
gatesPASS25.7s; same earned native/WASM9 full bridge replies identical. Public
real-WASM400/1440 eight-sample query leaves source save unchanged. Screenshots
show the camp after query, not an opened forecast table.

Required original two-seed diagnostic terminalFAIL125s: outpace100%, porter
11.4/worst12.1min, scout12.1min/3sendsPASS; away D1848/48h and mean27.96
vs28.14FAIL. This remains a failed gate, not a forecast-fix acceptance shortcut.
Experimental dayplayer remains unadopted. No full native/client/score claim.
Evidence in cut159 preserves all terminal logs, five actual cached entries,
sources, runtime identities, six captures and native/WASM/public observations.
