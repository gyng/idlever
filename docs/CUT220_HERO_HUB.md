# Cut220 — one place to build a hero

Design direction, not implemented acceptance. The owner asked whether hero UI
works like an RPG character screen, with equipment and skills together. This
refines the existing build-first queue; it does not add physics ragdolls or new
equipment slots. Finish the Cut219 progression wire before restructuring its UI.

## Current source

`web/src/ui/town.ts` hosts Loadouts, Class and Legacy tabs, with Appearance,
Run log and Hero actions above them. `bloodline-loadouts.ts` embeds saved
starting kits and reusable preparations. `hero-life.ts` owns persistent identity,
recovery and confirmed rebirth. Gear has four actual Rust slots: weapon, helm,
armour and boots. Behaviour and companions still have separate entry points.
The paper doll below is a proposal, not a delivered visual.

## Target layout

Use a hero folio in the existing ink-and-gilt material. The selected hero's name,
portrait and actual life state anchor the screen. Bloodline identity is secondary.
Switching residents changes the whole folio, including its pending choices.

| Section | Configure or inspect | Existing truth to preserve |
| --- | --- | --- |
| Gear | Four slots around a full-body sprite; saved loadouts; set details; prepared supplies | Actual gear versus next-departure gear, Follow/pins/fallbacks and free owned reuse |
| Skills | Class, specialization and connected cumulative skill tree | Existing class restrictions, unlocks and build-change rules |
| Behaviour | Stance, tactics, temperament, optional automation and unlocked pen | Rust-owned choices, observed facts and actual versus queued changes |
| Companions | Select an owned pet; inspect its actual abilities and leash requirement | Actual ownership and preparation limits; no recurring pet chore |
| Attributes | Lasting stats, inherited trait, family context and rebirth | Rust totals and modifier explanations; explicit commitment/reset boundary |

Keep appearance, rename and run history as secondary actions. Do not require
another panel to identify the current hero or explain whether a change is queued.
The phone layout may stack the doll and controls; keep sections reachable without
cramming every choice onto one view. Reuse existing section controllers rather
than duplicating mutations in a second set of screens.

## Equipment paper doll

Show the existing full-body character art with four labeled equipment anchors.
Selecting an anchor opens the existing legal choices and their actual tradeoffs.
Provide equivalent labeled buttons and a primitive fallback if art is missing.
Do not require dragging, invent rings/accessories, or suggest that an unequipped
catalogue item is owned. A selected slot must remain clear without color alone.

Display equipped set count and next-departure set count separately when they
differ. Set effects and stat totals come from Rust. Never calculate a second
combat model in TypeScript. Do not imply layered equipment sprites exist until
the art pipeline actually supplies them; a portrait with slot icons is an honest
first visual implementation.

## Build and commitment rules

Reusable gear, skills and behaviour stay easy to change within their existing
legal boundaries. Lasting attribute choices use the explicit confirmed rebirth
boundary. The hub must not introduce spending or resets merely to navigate.
An away hero retains its actual equipment and queued temperament boundary.
Stance and tactics use the current lineage in the runtime context and therefore
apply during an ongoing run. Canonical actual policy follows that real behavior;
its note distinguishes changes now from Next delve. The Hub does not freeze
legal live edits merely to simplify its presentation.
Unavailable choices show the actual reason and next requirement.

All asynchronous actions retain engine, resident and incarnation guards. A
resident switch or rebirth invalidates stale previews and pending mutation
closures. Inspecting, opening or switching sections preserves the exact save.
Town-wide Forge unlocks remain town-wide; a hero's personal kit stays personal.

## Acceptance contract

1. Real-WASM journeys cover320,400 and1440 CSS-pixel widths, normal and200%
   text, with Ready, Delving and Recovering heroes:18 layout/state combinations.
   Essential text and controls remain visible without two-axis scrolling.
2. Every actionable target measures at least44 CSS pixels. Keyboard order,
   tab navigation, visible focus, hover and pressed states work in each section;
   focus survives a live refresh and returns after closing nested details.
3. Actual equipped gear, next gear, set counts, skills, stats, pet and behaviour
   match the canonical Rust read model for all three paid residents. Test a
   hybrid set, pinned empty slot, saved kit and queued away temperament.
4. Three resident switches and an actual rebirth reject stale actions without
   changing the new owner's save. All read-only paths preserve exact saves and
   Gold. Owned reuse remains free; permanent Forge purchases charge once.
5. Verify missing-art fallbacks and reduced motion. Measure essential text
   contrast over the weakest actual material region:4.5:1 ordinary important
   text and3:1 inactive text. Preserve the existing Idlever palette and frames.
6. Post settled phone and desktop screenshots, including an actual/queued
   difference. Retain source, fixture and package identities with the evidence.
   A design mockup cannot stand in for real gameplay acceptance.
7. Before a lasting commitment, show canonical numerical gift and cost
   explanations, including activation condition, amount and affected stat.
   Names such as `mend` and `thin` alone do not explain an irreversible choice.
   Rust supplies these descriptions and their learned/unknown state; the client
   must not infer hidden penalties or construct a second combat formula.

This contract does not close progression balance, legendary collection pacing,
the full Journal, broader lighting or the fun-rating goal. Track those separately
in the existing queue and acceptance ledger.

## Integration audit

Implementation waits for the Cut219 wire freeze. The new folio/controller lives
in `hero-hub.ts` and its scoped CSS; Root owns the existing Town entry routes.
Route intent maps Loadouts to Gear, Class to Skills and Legacy to Attributes.
Appearance and Run log retain their existing secondary actions.

Reuse starting kits/free preparation, class tree/styles, persistent Hero life
and party controllers. Each mounted controller needs engine/resident/incarnation
scope guards, including pending callbacks: the existing class/party renderers
do not all enforce that boundary themselves. Keep scroll, opened details and
keyboard focus per section. Dispose the embedded Hero life controller when its
owner or folio closes; do not duplicate Rebirth confirmation logic.

The class tree/style renderers currently hide all content while away. Add an
explicit inspection mode so an away hero's learned skills remain readable;
mutation availability still comes from Rust. Behaviour and Orders need an
agreed embeddable controller or existing nested detail routes, rather than a
second set of mutation code in the folio.

Current equipment wire exposes actual weapon/body and canonical actual/next
armour rows. It does not expose one unified four-slot next build, including
next weapon, or its full stat totals. Request that canonical read before
claiming a paper doll represents the complete queued build. Trait gift/cost
explanations above are also a Core wire dependency. No client resolver or
guessed numerical formula fills these gaps.

## Unintegrated source checkpoint

`hero-hub.ts`/`hero-hub.css` now contain the folio header, five keyboard tabs,
four real slot anchors and a full atlas sprite with a primitive fallback.
Existing controllers supply gear, class tree/styles, temperament, party and
persistent attributes/Rebirth. Scroll, opened details and focus are retained;
engine/resident/incarnation scopes guard mutations and detached controls.
Nested detail routes use the folio lifetime rather than a replaced tab's
lifetime. `heroHubOwner` lets existing navigation leave that controller scope.

The class tree has an opt-in away inspection mode; its away learn/reset actions
remain disabled, with explicit event guards and unchanged canonical availability.
Party has an optional owner callback before/after vocabulary and editor writes;
existing callers retain their prior behavior. Town entry routes are not changed.
Weapon actual/next values remain Unknown rather than mislabeled preview fields;
three armour slots use canonical actual/next rows. Complete stat totals and
numerical permanent trait descriptions remain Core dependencies.

Scoped format/lint, integrated TypeScript and copy checks pass. This source is
not imported into the game and has no browser or visual acceptance yet. Cut219
final-package acceptance is the next runtime checkpoint; full Hub acceptance
waits for its wire and route integration.

## Runtime integration in progress

The Town `openHero` route now maps Loadouts to Gear, Class to Skills and Legacy
 to Attributes in the five-section folio. Appearance, Run log and persistent
Hero-life details remain available. A guarded mounted-camp bridge opens the
existing Orders controller; disposal removes the bridge, and owner/engine/
incarnation changes reject stale callbacks. Class selection also checks its
owner before and after asynchronous catalogue/purchase work.

Rust has added `StartingKits.equipment`: actual and next-departure four-slot
views, slot origins/effects/tradeoffs, stats and projection notes. The Hub reads
these values directly; the old preview names are no longer its equipment truth.
TraitCard and compatible FamilyContext wire descriptions include numerical
condition, gift and cost text with the existing learned flag. The new equipment
and trait consumers pass integrated TypeScript. Family-context descriptor
rendering and genuine new-package browser proof are still in progress.

`web/tests/hero-hub.mjs` is the new real-WASM harness. It records package, source
and fixture identities, all omitted geometry combinations, save/Gold boundaries,
legal slot-anchor reads, free pinned-empty/saved-kit choices and three-resident
read/stale-control checks. Its compact geometry design retains every18
state/width/scale combination and additional five-section baseline reads; the90
section Cartesian combinations remain explicit exhaustive mode. This is authored
coverage, not a passing runtime result. Ready/Away/Recovering fixtures and the
canonical package freeze must be settled before acceptance or milestone captures.

## Canonical read contract

`StartingKits.equipment` supplies four ordered slots (weapon, helm, armour,
boots), actual actor totals and a configured next-departure view. Totals use
Rust `Hero` methods. A paid home preparation is reused, including its consumed
ration and toll. An away projection uses isolated canonical preparation;
worker purchases and future finds are excluded and the wire says so. Reads
must preserve the whole save, Gold, Run, floor snapshot and sent capsule.

`actual_party` contains surviving allied Run pets and their current HP, with
frozen identity, abilities and rules. `party` remains the editable future
selection. `actual_packages` follows existing runtime behavior: stance and
tactics compile into current live rules immediately; temperament stays on the
sent actor until the next delve. `actual_packages_note` states that distinction.
This read work does not change when legal edits take effect.

Trait and compatible family-context cards expose declared numerical activation,
gift and cost descriptions. Declaring a build mechanic does not grant its
first-observed fact: learned/unknown state remains separate. Family changes
preserve the chosen trait's gift, cost and tier. Fixture derivations use public
choices on immutable earned Cut219 saves; no equipment or currency grants.

## Current integration source

Town routes now mount the five-section Hero Hub. Canonical equipment includes
actual/next four slots, totals and origins; prepared-home projection retains its
already paid/refitted actor. Trait and family context describe numerical
condition, gift and cost with canonical observed state. Actual party reflects
living run pets. Current behaviour uses live stance/tactics and frozen
temperament with explicit change timing. These source additions require their
scoped native tests, final WASM build and browser acceptance; source presence
and passing TypeScript alone do not complete this contract.

The current source also renders canonical actual pets and packages. Pets use
living Run actors; editable away companion selection is labeled Next delve.
Stance and tactics genuinely update live policy. Temperament stays queued, so
the Behaviour section uses Rust's `actual_packages_note` for that boundary and
shows its actual package cards separately. No mechanics were changed to make
these descriptions uniform. Numerical FamilyContext descriptions and learned
state now render, with separate Actual/Next rows. Scoped compilation, formatting,
Oxlint and copy checks pass. The runtime proof below supersedes the earlier
pending source snapshots.

## Final functional runtime proof

Package `66b8a12ef9b314138d82125bd2f944583fb56d40f85ba4bc8186e7f0425b3171`
(6,698,072 bytes) passes2,704 Hero Hub checks across all seven genuine fixtures
and30 compact geometry views in99.1s. Every Ready/Away/Recovering width/scale
combination remains covered;60 omitted section combinations are listed in the
results, and explicit exhaustive mode retains90 views. The other four fixtures
retain functional reads and mutations. A separate two-case public-selection
probe preserves the latest section while selection is pending and prevents a
late selection result from replacing a newer Hero route.

The retained survivor group passes805 checks, all ten functional cases and36
views in131.0s on this integrated source. This run overlapped separate diagnostic
and GPU work; its elapsed time is not a quiet comparative benchmark. The group
retains explicit180-view exhaustive geometry. Neither result certifies the full
client inventory, balance audit or fun rating.

Real-WASM lineage reads use five warmup reads and50 measured reads per fixture.
Seven medians range3.15–5.4ms/read; observed maxima range4.8–52.5ms. Whole saves
and Gold remain exact. This diagnostic includes bridge/JSON work and carries no
budget, cache or frame-rate claim. Native measurements remain separate.

Evidence and preserved failed phases: [UI evidence](evidence/cut220/ui/README.md).
GPU material, fallback and motion proof is scoped separately from these
functional results; milestone framing and lower-content contrast are retained
there. The paper doll uses class artwork with canonical slot anchors, rather
than layered equipment art.

The visual refinement subsequently passes2,840 checks/all seven cases/30 views.
It shares anchor copy only for complete matching canonical slot records; both
full timing records remain disclosed. A clipped atlas SVG preserves the full
frame while scaling the class figure up to200px and down to the available width.
An additional delayed-selection test proves explicit closure before completion
does not reopen the folio. The three-case route proof passes without new game
mutations beyond actual public resident selection.

Final CSS follow-up centres compact side anchors and sets the tab minimum
to6.5rem. Its explicit geometry-only manifest passes1,912 checks across all three
states/30 views in43.7s, including measured two-column tabs at normal400px and
full wrapping/targets at200%. The default functional manifest remains all seven
cases. Current-source milestone captures follow this CSS phase.

The final navigation uses a named outer folio container and deterministic3/2/1
columns. It passes1,939 checks/30 views plus eight probes around its420px and
15rem boundaries at normal/200% font size. This supersedes the still-wrapped
auto-fit navigation; source and failed visual snapshots remain preserved.
Final owned-server private-GPU milestones pass seven PNG captures and139
actual-material contrast samples, including genuine disabled away skills.
Home marker placement separately passes494 checks/25 phases. The final evidence
README records server ownership, source identities and corrected earlier
attribution. Exhaustive geometry, whole-suite acceptance and fun review retain
their separate scope.
