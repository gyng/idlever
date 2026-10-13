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
An away hero retains its live build; editable future intent is labeled Next delve.
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

This contract does not close progression balance, legendary collection pacing,
the full Journal, broader lighting or the fun-rating goal. Track those separately
in the existing queue and acceptance ledger.
