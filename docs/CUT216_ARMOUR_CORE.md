# Cut216 core contract — actual slots and departure intent

This implements `CUT216_ARMOUR_SETS.md`, rather than treating a collection as equipped armour. Historical Cut215 saves/evidence remain unchanged. The default configuration retains its existing body, combat RNG draws, item spawn weights and paid Forge progression.

## Equipment and effects

Weapon remains independent. Armour has three actual actor slots: `helm`, `armour` (body), and `boots`. New definitions have zero ordinary spawn weight. Helm and boots receive no copy of the body Forge rank bonus. Only the body uses the existing rank ladder. An empty new slot contributes zero guard, speed and effects.

| Shape | Slot | Base guard | Speed | Actual effect |
| --- | --- | ---: | ---: | --- |
| Ironcap | helm | 2 | -1 | Standalone defence, no proc |
| Trailboots | boots | -1 | +1 | Standalone speed, less defence |
| Hearthglass Hood | helm | 0 | 0 | Hearthglass family piece |
| Hearthglass | armour | 1 | 0 | Existing direct natural-hostile kill heal of 2 HP |
| Hearthglass Boots | boots | 0 | 0 | Hearthglass family piece |

Two **distinct equipped** Hearthglass pieces activate Embers: a direct hero attack killing a natural hostile foe refreshes a 30-game-tick regeneration window, healing 1 HP each 10 ticks. Refresh never stacks duration beyond 30. Three pieces additionally activate Glassward: unused HP from the body's existing 2-point kill heal adds ward, capped at 4. Ward absorbs subsequent positive incoming damage and is consumed. Full Hearthglass takes +1 incoming adjacent melee damage before ward, an explicit tradeoff. Regeneration cannot create ward; allied/summoned/hazard kills activate neither effect. Unequipping below threshold clears the corresponding temporary window/ward. Proc events name their actual source.

Full-set sustain must beat equal-rank standalone gear on a labelled repeated weak-foe scenario. Ironcap must win a burst/melee scenario; Trailboots or a pinned 2+1 hybrid must win a mobility scenario. Record all 16 paired seeds, not only a favourable example; these are controlled combat experiments, separate from earned progression.

## Permanent sources and staged protection

Existing Hearthglass body source is unchanged: Bloat Mother, or Warlord for Gunner. Warlord also grants both standalone shapes on their first actual natural hostile source kill, with real find/value/discovery receipts and no auto-equip. This expands choices before a family can be completed without adding an early UI requirement.

Hearthglass Hood uses the Lich (base D18) **after the town already owns the body**. Hearthglass Boots uses the Foundry Master (base D23) **after the town already owns the Hood**. Source eligibility is evaluated from ownership before the kill. Each eligible victory advances a town-wide monotonic counter for its missing piece. A tagged deterministic hash can drop at 1/4; the eighth eligible victory guarantees the missing piece. Only genuine eligible source victories advance protection. Ordinary deaths, completed non-source runs, reads and elapsed time do not. Once owned, duplicates use the existing repeat-drop 1/8 cadence and ordinary one-time Gold receipt. Source counters merge by max across shared-town copies; source processing always synchronizes the current town first. Pieces remain owned through ordinary death, stat rebirth and world reset.

Earned 16-seed probes must report first/second/third piece wall time, source victory count and actual event/run/hero provenance. A missing third piece is reported as a failed/unreached progression requirement, never silently turned into a controlled earned save.

## Saved kit intent and resolver

Extend existing `StartingConfig` with optional `helm`, `boots`, `follow_set` and `pins:{helm?,armour?,boots?}`. Existing weapon/body/new-slot values are saved fallbacks. `null` config preserves the existing class/default path; explicit `"none"` means deliberately empty. Existing named-kit CRUD persists these fields. Exact kits with no follow/pins retain existing semantics.

Per-slot resolution is compatible owned pin, compatible owned followed family piece, compatible owned fallback, then existing class default (empty for new slots). Validation rejects unowned/incompatible explicit pins and unknown families atomically. No Gold, ownership or actor mutation occurs on rejection. Class changes resolve actual compatible choices; the read model exposes blocked alternatives and truthful fallback. Turning follow off freezes currently resolved choices. A direct slot edit is an exact edit which clears that slot's pin/follow application as appropriate; UI sends the complete validated intent rather than reconstructing gear.

Resolve at real next departure after non-bypassable recovery. Editing a prepared home actor uses the existing paid-item-preserving refit; editing while away changes only future intent. Selected/pinned family slots on the actor are protected from automatic found-gear replacement. Unselected slots retain ordinary loot rules. Discovery in any resident cannot mutate another live actor or its historical capsule/death gear.

## Bounded source focus

`setSetFocus(family|null)` is a per-hero atomic action. It targets the next missing family piece's known source. Availability requires actual family ownership, actual source depth reached on the current legal route and no manual start pin beyond that source. It neither hires Scout nor unlocks unknown routes/waystones. The focus run uses the deepest actually lit/payable stone at or below its source, retaining the normal route, normal start and Guide preferences. An existing trial/paid seek takes priority and makes focus unavailable for that departure; no token is silently consumed by focus.

After departure the target source is frozen on the Run. Each completed focused run which fails to reach/defeat that source increments consecutive failures; an actual source victory resets them. Three failures end focus and restore ordinary planning. Actual ownership by any resident ends future focus immediately; the present actor finishes normally. Ending focus while away affects only later departures. Ordinary Apprentice budget/share/reserve rules remain unchanged; there is no new worker or equipment fee.

## Wire and acceptance

Existing CRUD remains the only equipment write boundary. StartingKits adds separate helm/boot catalogue rows and one Rust-owned `armour_sets` model: pieces with slot/ownership/source/availability, actual and next equipment with resolution origin, actual and next distinct counts, threshold/effect/active bonus rows, and focus source/status/action availability/failure count. Read-only previews must not mutate state or RNG. Counts come from the live actor when away and real prepared actor at home; queued counts come from the pure resolver.

Focused tests cover actual slot mechanics, 0/1/2/3 distinct counts, caps/proc exclusions/tradeoffs, source ceiling and no RNG consumption, complete pin/fallback/class/none cases, zero-Gold named reuse, prepared merged leash/kennel/ration/route/RNG retention, in-run protection, actual paid two-resident shared ownership, and whole/slice/reload parity. Run a final workspace fast native pass and default Clippy, retaining any failure logs. Client packaging and browser acceptance are coordinated by root after production source freeze. Cut216 does not close the remaining queue or the survivor-trait progression blocker.

## Frozen Core checkpoint — 2026-10-14

Current production source is frozen; its SHA-256 inventory is in
`docs/evidence/cut216/core-final/production-source-sha256.json`. Final focused
semantic coverage passes 10 cases, and the resumed default all-target Clippy
run passes with warnings denied. The original workspace run remains recorded
as 891 passed, one failed and six ignored: its single failure was the historical
46-item inventory count. Four explicit Cut216 definitions make that count 50;
the documented assertion amendment and dedicated recheck pass. This is not
reported as a new clean full-suite run.

The final current-source exporter completes through public pause/completion,
refit/send and genuine capsule replay. Its 19 immutable canonical game files
and separately labelled controlled Gunner/source-miss cases are in
`docs/evidence/cut216/ui-inputs-resume-final/`. The final real WASM built by root
is 6,640,427 bytes, SHA-256
`cb19f4d37cadccf03af24544e0631fef92137a84e6d232d2da5cd96cf6abb082`.
Actual client acceptance uses this package and remains independently owned.

The retained final earned survey proves collection on all 16 seeds within the
14-day bound. Body 24–64 h, Hood 48–88 h and Boots 80–112 h are check-in upper
bounds, not exact discovery timestamps. Seed 13 adds 60 s of actual recovery
clock before its absences. The survey precedes the final exact-family slot
protection, same-tick ward invalidation and paused-focus presentation fixes;
loading its earned saves under final source does not relabel it as a rerun of
final-runtime pacing. See `core-final/earned-timing-audit.json` for receipts,
committed clocks, requested absences and raw-save hashes. The eight-seed
idle-d8/idle-d13/reach run is targeted evidence only. Exhaustive balance,
survivor progression and the broader queue/fun goal remain open.

Final visual review found a stale source-miss note on a fully owned collection.
The Rust read model now gives `Collection complete` precedence when no piece
is missing. A previous failure note remains visible while a piece is actually
missing. This affects read-only status text; it does not alter saved history,
source counters, focus execution or discovery. The adversarial read-model test
checks both cases and exact unchanged whole-save state. The package above is
the preceding checkpoint; root records the rebuilt package identity separately.
