# Cut288 — isolate learned counters before changing encounter behavior

Owner: continue backlog. Cut287 source explanation was incomplete: the selected
summoner baseline already fires its learned Lich row at both spectral blades
(t860/t870), and L3 boss_focus independently compiles a summoned selector.
A no-boss guard in the card routine does not establish that the whole L3 package
cannot answer a conjurer. Correct the interpretation while preserving raw results.
Foundry golem baselines also actually fire learned Master reflect_read rows.

## Fixed diagnostic intervention before new measurements

Use exactly two existing earned parents, without new random search:
- Summoner: Cut287 trace-s1-d14-a1-baseline/normalized-input.json.
- Reflection: Cut287 trace-s1-d19-a2-baseline/normalized-input.json (earliest golem
  parent; already has an enabled Master drill and no explicit tactic).

Four arms per parent: current enabled drill baseline; publicly revoke only that
named Lich/Master drill; revoked + boss_focus/reflect_read L3 respectively; revoked
+ corridor_fighting L3. Preserve common fire, gear, stats, marks, clock, party,
initial floor, monsters and run RNG. Public home commands only; no grants,
retroactive changes or silent weakening of the current configuration. The
revoked arms are deliberately different policies, labelled diagnostic ablations.
Do not relabel them as Cut287's ordinary baseline or add them to its search.

Capture full native events/positions/maps and complete terminal saves with exact
step(1)/step(100) parity for all eight departures. Quote actual row/action events
on the starting floor; compare physical action streams separately from row indices.
Measure hero damage by cause, drain/reflection hits, summoned attack order and
run endings. A tied result stays tied. Use the source compile order and actual
fired row to distinguish shadowing from an ineffective tactic.

No success threshold is needed to force a diagnostic outcome. This is attribution,
not a new formation/counter implementation or a causal-superiority certificate.
Product changes require their own measured contract; no core/WASM/defaults,
held upgrades, recovery, release or deployment change here. R3's six distinct
counter/formation acceptance and broader balance remain open.
