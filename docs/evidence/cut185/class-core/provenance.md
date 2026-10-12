The initial focused session 77119 terminated 101, 8/9 passing. Its complete
reported terminal stdout/stderr is transcribed verbatim in initial-focused-tests.log
from the exec output; it was not redirected to a file at process start. Earlier
compile attempts found wrong Cond constructor and snapshot field references;
those were test/development compile errors and corrected before this run.

The failed cache assertion assumed lineage_key contains active rules. The existing
forecast explicitly keys those separately (forecast.rs, active set comment), so
changing the path need not change lineage_key. The corrected test compares the
pair of lineage_key and rules_key: inactive class memory keeps the pair; the
active compiled path changes it; removal restores it. Production cache behavior
was unchanged. All original save, migration, isolation, ordering and real-action
assertions are retained. Additional tests cover 90 bounded authored-policy runs
and representative actual leaf effects for all five classes; these controlled
fixtures provide no earned-progression, blind or balance-audit credit.

Session16447 terminated101,9/11. Complete reported terminal output transcribed
verbatim in first-bounded-diagnostic.log. The new representative action fixture
used nonexistent monster kind `warlord`, which has no boss tag; corrected to real
`goblin_warlord` for mark/aim tag:boss actions. The newly introduced diagnostic
asserted every run ends within 10,000 ticks, which is not a game invariant (normal
run cap is120,000). Replaced that arbitrary finish requirement prospectively
with genuine exit OR observed combat and depth progress inside10,000 ticks,
printing exact per-node fires/attacks/depth/end status for all90cases. This is
limited sampled progress evidence, not universal absence of loops. Stalker and
Ambusher now explicitly hide before backstab/ambush, so their offensive policy
supplies its own opening instead of depending on an unrelated equipped tactic.

Owner explicitly selected cumulative ability unlocks after the exclusive work.
The superseded exclusive contract and11/11 passing test log remain separately
preserved and do not certify the cumulative implementation. New cumulative
wire/API/state/tests replace them. Ability mechanics will be snapshotted in six
class-local authored node bits at send, with zero omitted for old/no-choice saves.

First cumulative run15798:8/9,terminal101, redirected entire raw output in
cumulative-focused-tests.log. The staged-gate inventory correctly caught both
Reaver children being set to L5/D13. Boss breaker is now L7/D18 so every root has
exactly one L5/D13 and one L7/D18 child. No acceptance assertion was relaxed.
Ability effect briefs now name the actual improvements (damage/timers/HP), not
only policy summaries. Existing class-local verbs keep automatic unlock timing.
