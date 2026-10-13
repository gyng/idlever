# Cut215 — legendary discoveries for builds

Owner2026-10-13: legendary items drop, are kept automatically and permanently
unlock the corresponding Forge item. Keep progression and upgrades useful
without adding chores. This joins the active full queue; it does not replace
persistent-hero, pacing or remaining content work.

A legendary is a named item with a distinct build effect and an explicit cost
or limitation. Existing enchantment-based legendary rarity is not sufficient.
Start with three distinct items across weapon/armour roles. Each has one
readable effect and one meaningful tradeoff, with a real situation where an
ordinary owned item is preferable. Never add a global legendary damage tier.

Discovery is the reward. Actual pickup immediately records permanent town-wide
ownership in Rust, including a later death. Every resident can try that shape;
their actual upgrade ranks and attributes remain separate. No Keep, Claim, extraction requirement,
repair, durability, crafting materials or repeated use fee. One concise find
announcement links to the actual Forge/Loadouts choice. Reading that link
cannot spend currency or equip the item silently.

Unlocked legendary shapes join existing starting kits and saved named builds;
using or switching owned gear is free at home. Forge's existing permanent
weapon/armour upgrades still apply to their actual gear. No duplicate-level
ladder, reroll shop or second progression wallet. Slow Legacy attributes and
class skills remain distinct. Duplicate discoveries pay ordinary item value
once, create no additional power and need no inventory cleanup.

Drops must be real deterministic dungeon events. Choose an earned early boss
milestone for the first discovery and bounded later boss/rare-loot sources.
No new RNG draws should perturb ordinary encounter/combat rolls merely by
reading or presenting a catalogue. Document exact eligibility, first-discovery
rule and repeat rule before implementing them. No required legendary to reach
an existing gate, and no inaccessible catalogue flood in a fresh town.

Acceptance: all three real effects and tradeoffs tested at identical gear
upgrade ranks; same encounter/RNG/build except the chosen item. At least one
actual scenario per item improves its intended result and one favours ordinary
gear. Permanent ownership survives death, normal/world/stat resets as specified,
reload and independent bloodline selection. A single actual discovery produces
one unlock/announcement; duplicate value never pays twice after theft, drop,
replay or reload. An unowned item cannot be equipped by forged config IDs.

Whole/sliced/reloaded offline discovery and loot totals must match exactly.
Discoveries from different residents merge without lost unlocks or duplicate
announcements; switching the selected resident cannot restore an older collection.
Prepared-home kit changes must refit the already prepared actor without paying
or spawning twice, retaining actual companions/free supplies/ration/toll/RNG.
A selected unavailable/class-incompatible shape is refused atomically.

Use real earned first-discovery fixtures in at least seeds1/13 and a16-seed
bounded drop survey, with discovery timing and outcomes recorded. Verify fresh,
first-find, duplicate, owned-choice, away/stale-owner and saved-kit UI states at
320/400/1440 normal/200%;44px controls, no overflow, exact no-use Gold change.
Post Forge and live-drop screenshots. Final native/Clippy/real WASM/client and
targeted current-game progression checks are required; broad balance/fun remain
separate acceptance, never inferred from this content cut.

## Implemented checkpoint

Three named patterns are sourced from real boss defeats: Crownsplitter from the
Warlord (Hearthglass instead for Gunner), Hearthglass from the Bloat Mother, and
Frostmantle from the Lich. Each first eligible unowned source is guaranteed;
repeats use a pure run-seed/boss hash at1/8 without consuming combat RNG.
Named patterns have zero ordinary loot weight. Duplicate value follows normal
loot settlement; ownership is immediate and safe on death.

Current16 focused native cases and7 existing kit cases pass; warnings-denied
Clippy passes18.55s. The880 full native pass predates the metadata-only rarity
field and three later test additions; it is not a full-current audit claim.
Eight-seed idle-d8/idle-d13/reach passes29s. All16 bounded earned first sources
are Fighter/Crownsplitter atD8 in6–21 hours with actual affordable upgrades;
Hearth/Frost/Gunner/later-boss effects and death receipts are controlled proof.

Actual earned menus305 checks/48 layouts, controlled catalogue103/24, icons378,
and first-discovery Watch/Report/Death221 checks/42 layouts pass. First Legendary
receipts are visible outside Report details and say Free Forge choice. Viewing
gear performs no equip/purchase/claim; ordinary live simulation continues.
Report/death inspection preserves exact saved state. The old Forge find-count
ladder excludes owned named choices;16 actual earned checks preserve all24
ordinary rows per seed. Default tests do not overwrite frozen proof artifacts.

The Forge ladders remain canonical. Explicit armour inherits a nondecreasing
bonus relative to the first default leather tier; some default-shape milestones
are flat for an already owned shape. Actual choice stats include these ranks.
Death/stat rebirth retain ownership and ranks. The existing world reset retains
ownership but clears paid gear ranks/Gold. No legendary duplicate-power ladder.

Evidence and actual settled screenshots: docs/evidence/cut215/{core,ui,discovery,root}/.
Later earned all-three/duplicate timing, full balance/exhaustive regression and
fun review remain part of the broader queue. This checkpoint does not deploy.
