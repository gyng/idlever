# Cut247 — exact armour effects in quiet tick batches

Contract 2026-10-16. Correct the proven current-runtime simulation discrepancy;
keep authored armour values, progression policy and every existing gate unchanged.
This is engine correctness work. It does not establish class/weapon superiority,
R4/R6 completion, exhaustive acceptance or fun. The Cut246 comparisons on e62c
remain historical observations of a mismatched scheduler until revalidated.

## Preserved failure and scope

The earned fighter/sword departure133 has two Hearthglass pieces. On e62c,
public single-step continuation and held replay both Bank at D22/tick33345.
The same immutable sent Session continued through an eight-hour absence dies to
a lurker at D28/tick43260. Complete actual RunRec matches the recorded absence.
At second94/tick940 the first run-state difference is only `hearth_regen`:
single ticks28, batched29. `turn::tick` calls `armour_sets::tick` each tick;
quiet spans skip that call and leave the regeneration timer unchanged.

Preserve exact earned inputs, original e62c package, current native executable,
source hashes, original observed outcomes and public-action reproduction before
editing production. No grants, RNG changes, refund or gear replacement may be
used to make the earned case agree. Controlled timer tests are labeled fixtures.

Audit every effect in `armour_sets::tick`: piece-count clearing, two-piece
regeneration duration, heal timing before energy/actions, maximum-health bounds,
and three-piece ward retention/clearing. Quiet spans must reproduce each skipped
tick's armour effect, including expiry before the next ten-tick healing boundary.
Do not change proc duration30, heal1, kill healing2, ward cap4, set requirements,
weapon/class rules, or balance values. Other discovered scheduler discrepancies
are reported separately before expanding this focused patch.

## Numeric acceptance

1. The actual earned sent Session runs to the same exit tier, depth and tick by
   single ticks, real quiet batching and held replay. Event sequences/hash, RNG,
   full serialized run state, HP, armour timers, facts and tally outcomes match
   exactly. Exercise real skipped spans; do not disable the whole optimization
   or normalize gameplay differences. Check at bounded intervals and at exit.
2. Controlled boundaries cover all0–3 set-piece counts, regeneration0/1/2/9/10/
   11/29/30/31, turns adjacent to ten-tick boundaries, full/injured health, and
   ward0/1/4. Compare single/batched events, complete run and Game save exactly
   across arbitrary widths1/2/3/7/9/13/23. At least one case must actually skip
   ticks. Include explicit independently expected heal and expiry outcomes.
3. One and three genuinely earned resident Sessions each complete a declared
   eight-hour whole/sliced/reloaded absence with exactly equal complete reports
   and saved Session/replay state; immutable original inputs remain unchanged.
   Preserve selected identity, shared Gold, current supplies, quantity, privacy
   and run attribution. Archive raw outcomes; do not call old e62c absence
   outcomes the expected result when the scheduler defect changed those outcomes.
4. Preserve the focused pre-fix failing proof. Focused fast-profile tests pass,
   then the full fast workspace and default all-target workspace Clippy pass.
   Use bounded native concurrency and retain each source/binary boundary.
5. Coordinate rebuilt real WASM before replacement. Record actual served bytes,
   regenerate settlement manifests only with explicit changed-field comparisons,
   revalidate affected actual public send/absence/replay cases and one/three
   resident parity, and run current routine full and the required affected pacing
   pack. Never weaken a bar or relabel older e62c passes onto changed runtime.
6. Record dated observations distinguishing measured facts from interpretation,
   source/package/input provenance, confidence and revalidation triggers. Preserve
   old failures and original e62c comparisons as historical. No recommendation
   based on reconstructed class/weapon events is current until replay matches.

Evidence: `docs/evidence/cut247/`. Production editing begins only after the
coordinated pre-fix checkpoint. No UI or art changes belong to this cut.
