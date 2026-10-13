# Cut205 — individual class skill icons

Inventory: class-icons.ts already supplies class/path symbols; class-skills.ts
uses existing verb art for ability rungs. The class tree currently reuses the
first tactic's verb icon, so distinct policies share a symbol. Rust class_tree.rs
defines30 public policies: six each for Fighter, Rogue, Ranger, Caster and Gunner.
These new insignias identify those exact nodes, without replacing existing class
or verb icons or adding game rules.

## Numeric contract

- Exactly30 supported core node IDs, each with a unique meaningful SVG composition;
  core inventory parity is checked directly against definitions, not a copied
  test list. Unknown IDs get one deterministic neutral fallback.
- Render every node at24/32/48px in locked/available/learned states:270 board cells.
  No missing art fetch, external image dependency, randomness, animation or font
  glyph dependency. Preserve BONE/INK/MIST/GILT palette and broad ink silhouettes.
- Locked/available/learned states remain distinct without colour alone (lock,
  readiness pip, learned check). Locked glyphs retain readable contrast; no global
  low-opacity wash. Symbol details stay broader than roughly1px at24px.
- Standalone icons have accessible names from the supplied real node.name; beside
  existing visible names, callers may explicitly mark them decorative. Icons
  do not invent, rename or silently summarize a skill's effect.
- A private-GPU board capture and DOM checks validate all270 combinations, unique
  compositions, correct names, bounds and fallback. This is a visual/asset check,
  not earned progression, blind semantic recognition or combat-FX acceptance.
- Root integrates tree/review/live attribution; this lane changes only the icon
  helper/CSS and its focused tests/evidence. Existing combat animations and richer
  trigger attribution are retained follow-up work, not delivered by these icons.

## Asset checkpoint

`ui/skill-icons.ts` supplies30 inline SVG compositions; `skill-icons.css` supplies
shared ink/BONE/MIST insignias and shape-based state marks. Existing class and
verb icons remain untouched. The helper accepts the real node's ID/name/owned/
available fields,24/32/48 sizing, and an explicit decorative option. Unknown IDs
use a deterministic neutral rune; no external bitmap or font glyph is required.

The private-GPU board and final focused headless check pass all270 combinations,
30 unique compositions, direct Rust-definition ID parity, exact accessible names,
CSS dimensions, nonempty SVG path bounds and deterministic fallback. GPU board
shots at1440/400 are in `docs/evidence/cut205`. Source TSC, scoped Oxlint and default
format pass. SVG geometry literals use `copy:none`, because commands are not
player copy; remaining copy-lint failures at this check were nine unrelated new
design-system-board labels in the parallel UI lane, not icon helper text.

Root integrates24px tree/full-map icons and32px skill-review icons. A separate
private-GPU controlled real-WASM fixture verifies locked/available/learned tree
states and a genuine Rust learn action through review. It is UI/asset evidence,
**not earned progression**. The first integration capture used a no-HMR server
with cached pre-integration code and failed the new-icon presence check; a fresh
port closes that proof. The learned-tree shot also reveals pale inherited text
on parchment in the existing parent panel; root is correcting parent typography.
Icons themselves remain high contrast. The archived initial shot does not certify
complete tree readability until that owning CSS fix is captured.

Factual live attribution must use the executing row's `class:path:<node_id>`
origin, not its verb (many nodes share verbs). At this checkpoint Rule events
contain row/verb/text but no skill ID. Current rules can differ from historical
replays, so root/core own explicit per-event identity and follow-on integration.
Do not attribute passive skill bonuses as policy triggers. Combat animation/FX,
live event identity, wider semantic recognition, and blind art/fun acceptance
remain separate work; completing30 insignias does not complete combat feedback.

Root integration now uses the Cut203 immutable `EvRule.skill` fields in the
combat log/callout and skips package-observer attribution for tagged skills.
A controlled real-WASM learned Recovery actually fires `second_wind`; its log
shows the exact `fighter_recovery` icon and Rust name. The quiet-rule filter
retains tagged skill events and suppresses its ordinary untagged control.
This supersedes the earlier missing-wire note above. Passive bonuses are not
labelled as policy triggers, and no new combat animation is claimed. Cut204
fixes parent-panel contrast with measured Class/Legacy text and enlarged layout
checks; fresh affected tree journeys are part of root's integration checkpoint.
