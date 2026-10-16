# R4: why the preserved earned packages fire no Fighter/Caster class verbs

Read-only source/evidence review, 2026-10-16. Source identity: checkout `d2d3b56c`.
Evidence: `docs/evidence/cut246/actions-8879.json` (wasm `8879ed1150…81dff`, input
`revalidation-8879-1/results.json`), `docs/evidence/cut246/revalidation-8879-1/*.replay.json.gz`
(recounted independently below), `docs/evidence/cut246/visual-review-2026-10-16.{md,json}`
(+ `weapon-surviving-targets-8879/results.json`).

## 0. Root cause in one paragraph

The verb *implementations* exist and are already proven in-tree (`class_tree_tests.rs:390`
`representative_leaf_verbs_act_for_every_class_on_real_controlled_targets` fires Fighter
`second_wind` and Caster `nova` through `ai::try_verb`). What the ten preserved forks lack is any
*authored row* that names one: the active rule set is `packages::compile` (packages.rs:632-696) and
every one of its possible class-verb sources is empty in those packages — `pkg.pen = []`,
`pkg.custom = []`, `pkg.tactics = []`, no specialization, and `lineage.class_paths` **absent** for
all ten forks, so `class_tree::rows` returns `vec![]` (class_tree.rs:733-734). The class-policy
default row exists only for Gunner (`firearm::row`, firearm.rs:135) and Clown/Engineer
(`tools::row`, tools.rs:923-929); Fighter and Caster have none. CUT246's own contract froze this in
place: “Keep the existing armour family/pins, supplies, **class skills**, Legacy, party, **packages**
and workers identical within each class pair” (CUT246_EARNED_BUILD_COMPARISONS.md:38), and the forks
carry `selectedClassSkills: 0` (`actions-8879.json` rows, computed as `sent.run.hero.class_skills ?? 0`,
`action-review.mjs:26`). So the absence is an authoring/adoption gap in the prepared build, not a
dropped event, a recorder blind spot, or a broken verb.

## 1. Per-verb table

Fork facts used: `hero.level = lineage.class_level()` (engine.rs:4204, 2330-2332) → Fighter forks
**hero.level 8 / class_level 8**, all other forks **hero.level 1 / class_level 1**; every fork
`best_depth 28`, `class_paths` absent → `class_skills = 0` (engine.rs:4211, `class_tree::mask`
class_tree.rs:752). Ladder/level gate: `class_has_verb(class, level, verb)` (hero.rs:128-130) over
`class_ladder` (hero.rs:118 Fighter, hero.rs:121 Caster).

| verb | exists? (dispatch / impl) | gate(s) with file:line | authored in the preserved sets? | verdict (a–d) | evidence (counts / file:line) |
|---|---|---|---|---|---|
| `shield_bash` | yes — ai.rs:786; melee reach via `verb_attack(...,bash=true)` ai.rs:1448-1472 (bash strike at ai.rs:1469) | class_has_verb(hero.class,hero.level,"shield_bash") ∧ `bash_cd==0` ∧ adjacent → **L1 ≤ 8, feasible** (hero.rs:118, ai.rs:786) | **no** — compiled set has no such row (`pkg.pen=[]`,`custom=[]`,`tactics=[]`,`class_paths` absent → packages.rs:637,663,667) | (a) not authored | fighter/sword `attackVerbs {"attack":353}`; fighter/crownsplitter `{"attack":555}`; no `shield_bash` in either `attackVerbs` or `ruleVerbs` |
| `cleave` | yes — ai.rs:827; `verb_cleave` ai.rs:4605-4607 | class_has_verb(...,"cleave") ∧ `cleave_cd==0` ∧ `v.adj>0` → **L3 ≤ 8, feasible** | **no** | (a) | fighter/sword 353 attacks, fighter/crownsplitter 555 attacks, zero `cleave` rule or attack verbs |
| `taunt` | yes — ai.rs:828 | class_has_verb(...,"taunt") ∧ `verb_taunt` → **L5 ≤ 8, feasible** | **no** | (a) | same two counts; `taunt` absent |
| `second_wind` | yes — ai.rs:829-844 | class_has_verb(...,"second_wind") ∧ `!second_wind_used` ∧ `hp<max_hp` → **L7 ≤ 8, feasible** | **no** | (a) | same two counts; `second_wind` absent |
| `bulwark` | yes — ai.rs:845-852 | class_has_verb(...,"bulwark") ∧ `bulwark_cd==0` ∧ `!v.foes.is_empty()` → **L9 > 8: gate itself fails** | **no** | (a) not authored, **and** infeasible at the fork’s level 8 | `actions-8879.json` fighter rows `heroLevel 8`; hero.rs:118 `("bulwark", 9)` |
| `bolt` | yes — ai.rs:933; `verb_bolt` ai.rs:1239-1300+ | class_has_verb(...,"bolt") ∧ target in `BOW_RANGE` with LOS → **L1 ≤ 1, feasible** (hero.rs:121) | **no** | (a) | caster/dagger `attackVerbs {"attack":166}`; caster/bow `{"shoot":65,"attack":87}` — a *weapon* mode, no `bolt` in either list |
| `ward` | yes — ai.rs:934-947 | class_has_verb(...,"ward") ∧ `ward_cd==0` ∧ `!v.foes.is_empty()` → **L1 ≤ 1, feasible** | **no** | (a) | same caster counts; `ward` absent |
| `blink` | yes — ai.rs:948; `verb_blink` | class_has_verb(...,"blink") → **L3 > 1: gate fails** | **no** | (a) + infeasible | caster forks `classLevel 1` (`actions-8879.json`) |
| `slow` | yes — ai.rs:949; `verb_slow` | class_has_verb(...,"slow") → **L5 > 1: gate fails** | **no** | (a) + infeasible | same |
| `nova` | yes — ai.rs:950; `verb_nova` | class_has_verb(...,"nova") → **L7 > 1: gate fails** | **no** | (a) + infeasible | same |
| `drain` | yes — ai.rs:951; `verb_drain` | class_has_verb(...,"drain") → **L9 > 1: gate fails** | **no** | (a) + infeasible | same |
| *(control)* `throw` | yes — ai.rs:826; Rogue ladder L1 hero.rs:119 | class_has_verb ∨ `unlocks.contains("throw")` ∧ `verb_throw` | **yes** — authored by the preserved drill row `throw fire,tag:boss` (`pkg.drills[1]` = `drill:bloat_mother`, compiled packages.rs:648-651) | fired, attributed | rogue/crownsplitter `ruleVerbs … "throw":1`; all other rogue/caster/fighter forks 0 |

Verdict classes: **(a)** not authored in those sets; **(b)** authored but infeasible; **(c)** authored
and feasible but never selected; **(d)** fired but unattributed.
No verb is **(b)**, **(c)** or **(d)**: the compiled set never names any of them (so nothing can be
shadowed or blocked), and both attribution channels are present and correct — the row verb lands in
`Ev::Rule{verb}` (`emit_rule_owned` at turn.rs:755, fn at turn.rs:1516) and the attack verb in `Ev::Attack{verb}`
(e.g. ai.rs:1261 `verb: Some("bolt".into())`, ai.rs:4617 `hero_attack(..., "cleave", false)`).
The one class-ladder verb that *is* authored (`throw`) fires and is counted, which is the positive
control that the pipeline works.

Independent recount (not trusting `actions-8879.json`): parsing every
`revalidation-8879-1/*.replay.json.gz` and counting `k=="rule"` verbs + hero `k=="attack"` verbs gives
`caster-bow {shoot:65, attack:87}`, `caster-dagger {attack:166}`, `fighter-crownsplitter {attack:555}`,
`fighter-sword {attack:353}`, `gunner-* {fire:…}`, `ranger-bow {shoot:65, attack:91}`,
`ranger-sword {attack:540}`, `rogue-* {attack:…}` and **zero** `cleave/shield_bash/taunt/second_wind/
bulwark/bolt/ward/blink/slow/nova/drain` in any of the ten.

## 2. Why an authored row that names an unperformable verb explains nothing here

For completeness of the mechanism (turn.rs:752): `let acted = holds && ai::try_verb_scoped(...)`. A
gate that fails returns `false`, the row falls through (`turn.rs:809-833` records `row_why` via
`ai::block_reason`, ai.rs:466-575), and when no row acts the engine takes its own chore
(`ai::chore`, row −2: `explore`/`pick_up`, turn.rs:836-839). Nothing is lost silently at that point.
Note the why-not table has **no** `"class locked"` arm for these eleven verbs: unlike
`smoke_retreat`/`aimed_shot`/`fast_reload`/`finishing_shot`/`riposte`/`hex` (ai.rs:475-524), an
authored `cleave` on a level-1 Rogue reports `cleave ✗ no path` (falls into the
`_ if crate::turn::targets_foes(verb)` arm, ai.rs:554-574 → ai.rs:566/573), i.e. the diagnostic names
the wrong cause. That is a real but *secondary* gap (see fix 3) — it is not the reason R4 is open,
because no fork authors those rows at all.

## 3. The two claims are separate, and the evidence supports both differently

**Verb gap.** A *policy/authoring* fact, fully supported by `actions-8879.json` + the replay recount
above: the ten forks author zero class verbs. The gap is provable and the cause is mechanical
(empty pen/custom/tactics, absent `class_paths`). Nothing in the evidence says a class verb *failed*
to fire; it says none was ever requested.

**Painted-sprite mismatch.** A *presentation identity* fact, also supported, with its own evidence
and a different location. `visual-review-2026-10-16.md` (a dated review retained over the 40 frames of
`weapon-surviving-targets-8879/results.json`, `status PASS`, 40 rows, e.g.
`ranger-sword-canvas-1440.png` sha `d3ffe0fb55372df1…`, `caster-dagger-canvas-1440.png`
`349fc5b93982e102…`, `caster-bow-canvas-1440.png` `56a9e83c5230746b…`,
`gunner-short_gun-canvas-1440.png` `1888140330e2059f…`) records “Ranger Sword still shows Bow,
Caster Dagger/Bow still Staff, Short Gun still long shoulder gun; Crownsplitter is not distinct.”
The code location differs from the verb gap: the dungeon hero’s drawn sprite id is
`format!("hero_{}", h.class.name())` (engine.rs:5013) while the true gear is already on the wire as
`weapon: h.weapon…kind` (engine.rs:5029), and `web/public/art/atlas.json` only contains
`hero_<class>[_male|_female|_cat]` ids — there is no per-weapon hero art and no weapon layer for the
dungeon renderer (`web/src/render/atlas.ts:289-293`, `look.ts:14`; the only composed-gear figure is
the Hub’s, `web/src/ui/hero-equipment-figure.ts:224`, whose 10 layers live under
`web/public/ui/equipment/` and are not mounted by `web/src/render`). The review itself keeps the
claims apart (“Robe/staff appearance must not be mistaken for a recorded spell firing”,
visual-review-2026-10-16.md §Inspected branches) — the two must not be conflated, and neither the
sprite review nor the verb inventory can substitute for the other.

## 4. Smallest correct changes (+ the test that proves each)

1. **Fighter, no engine change (earned, public API).** Adopt class-tree picks on the fighter fork
   before `send`: `class_tree::learn(&mut g, "fighter_warden")` (row `adj>=1 & hp<70 → shield_bash`,
   class_tree.rs:113-120), `"fighter_reaver"` (`adj>=2 & hp>55 → cleave`, class_tree.rs:144-149),
   `"fighter_recovery"` (parent warden; `hp<55 → second_wind`, class_tree.rs:121-133). Gates are
   already met at the fork’s state (class level 8 ≥ 3/5/7, `best_depth` 28 ≥ 8/13/18, spent 0 <
   budget 6) — class_tree.rs:493-543, 614-658 — and the rows compile into the set at packages.rs:667,
   ahead of the `attack nearest` fallback (packages.rs:676). *Proof:* extend
   `docs/evidence/cut246/action-review.mjs` (after its `attackVerbs`/`ruleVerbs` counts, lines 31-44)
   with an assertion that the union of those two maps contains the class under test’s verb, at least
   once per branch — today the script only *records* the emptiness, which is exactly why R4 stayed
   open. Mirror it in Rust with the local `try_verb` harness style: class_tree_tests.rs:390-450.
2. **Caster (smallest path).** Every caster node needs class level ≥3 (`class_tree.rs:493-495`
   “reach class level 3”) and the caster fork is class level 1, so the one-call fix is a pen row: the
   pen is already open (`pkg.pen_open: true`, `pkg.pen: []`), and `Game::set_rules` (engine.rs:3699)
   writes player rows into it via `packages::absorb` (engine.rs:3753-3756, packages.rs:728-747) →
   compiled first (packages.rs:637). One row `foes>=1 → bolt nearest` (and/or
   `hp<70 & foes>=2 → ward`) is feasible: `bolt`/`ward` are ladder L1 (hero.rs:121) and
   `class_has_verb(Caster, 1, …)` is true. *Proof:* same replay assertion as (1), plus a Rust test
   calling `ai::try_verb` with `bolt`/`ward` on a level-1 Caster fixture (pattern:
   class_tree_tests.rs:390). If the experiment must stay “earned only”, the alternative is to level
   the caster class to 3 / D8 first and then adopt `caster_channeler` (bolt) and `caster_guardian`
   (ward) — a larger change to the input, which is why it is second.
3. **Diagnostic nit (P3, optional).** Add `"class locked"` arms in `ai::block_reason`
   (ai.rs:466-575) for the ladder verbs that have none (`shield_bash`, `cleave`, `taunt`,
   `second_wind`, `bulwark`, `bolt`, `ward`, `blink`, `slow`, `nova`, `drain`, `shoot`, `backstab`,
   `ambush`, …), the way `smoke_retreat` (ai.rs:505-508) and `aimed_shot` (ai.rs:509-514) already do,
   so an authored-but-unperformable row reads `cleave ✗ class locked` rather than
   `no path`/`given up`. *Proof:* assert `block_reason` == `"class locked"` for `cleave` on a level-1
   Rogue.
4. **Sprite identity (separate deliverable; do not fold into 1-3).** Compose the dungeon hero from
   `Snapshot.hero.weapon` (engine.rs:5029) instead of the class-baked `hero_<class>` id
   (engine.rs:5013): either add `hero_<class>_<weaponkind>` variants / a weapon layer to
   `web/public/art/atlas.json` + `web/src/render/atlas.ts`, reusing the already-shipped Hub layer
   pipeline (`art/equipment.json`, `web/src/ui/hero-equipment-figure.ts:224`), or, minimally, suppress
   the baked weapon when `snapshot.weapon` disagrees. *Proof:* a browser capture assertion that the
   hero’s drawn slot/layer set tracks `snapshot.weapon.kind` for ranger-sword, caster-dagger/bow and
   gunner-short_gun — the existing 40-frame harness (`weapon-surviving-targets-8879/results.json`) is
   the right place to add it.

## 5. Could not determine

- **Whether a painted per-weapon dungeon sprite exists anywhere but the Hub.** `atlas.json` has no
  weapon-bearing hero ids and no weapon layers; `art/equipment.json` assets are Hub-only. So fix 4’s
  art cost (new painted layers vs. procedural/no-baked-weapon fallback) is undetermined without the
  art pipeline owner.
- **The exact `max_rows`/row-cap headroom per fork.** `RuleSet::active` caps *own* rows
  (rules.rs:374, `Row::is_pkg` rules.rs:329), and the forks’ cap came from `lineage.max_rows()`; I did not read that value from
  the sent sessions, so “one pen row fits” is inferred from the forks holding zero own rows today.
- **Whether the owner wants a Fighter/Caster default policy row** analogous to Gunner’s
  (`firearm::row`, firearm.rs:135) or Clown/Engineer’s (`tools::row`, tools.rs:923). Such a row would
  make class identity self-evident in every future earned build, but it is a gameplay/design change,
  not a fix to the evidence gap, so it is deliberately not proposed as “smallest”.
- **Which of `blink`/`slow`/`nova`/`drain` the owner would call proof of Caster identity** at a level
  where they are reachable; the ladder (hero.rs:121) puts the signature `slow` at L5, so a level-1
  caster fork can only ever show `bolt`/`ward` without re-earning.
