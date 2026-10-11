# Cut 136 — encounter contrast, preparation contract

Status: prepared, not implemented or played. The owner requested more content and refinement work. This cut makes the first item in `WORK_QUEUE.md` executable after the frozen `d34605e` independent cohort finishes. Fresh blind findings take priority and may change which biome starts first. Do not change product, tests or assets, run simulations, or open another browser during that cohort.

The problem to investigate is whether existing fights produce recognisably different preparation choices. More enemy names or room shapes alone do not establish that. Existing room variation, band situations, route changes, champions and boss affixes are already delivered.

## Existing systems and proposed comparisons

Use `gen.rs::layout_for`, `defs.rs::spawn_table`, `situations.rs::band_on/place_twist` and the existing monster placement. Eligibility follows the route's biome, not a hard-coded depth. These are source-backed hypotheses, not measured tactical claims:

| Biome | Contrast to inspect | Existing responses to compare |
|---|---|---|
| Fens | Gas approaches versus fast packs around open ground/water | Earned `gas_step` versus `pack_break`; record actual package level and compiled actions. |
| Crypt | Drain/hunger pressure versus packs with a summoner | Existing light/shrine preparation versus target selection and corridor retreat. Identify the available public choice at the saved state before testing it. |
| Foundry | Melee reflection versus alarm/support pressure | Earned `reflect_read` versus target priority. Hunter already handles several tags; do not assume the same stance is a meaningful contrast. |

Fens caves have no lock-room doors; `FENS_POOL` correctly excludes `lock`. Preserve this and existing flagship, forced-stray, boss-room and nonrepeat constraints. `gas_step` and `pack_break` gain additional rows at level3; a comparison must distinguish an unlevelled package from its trained version. `iron_gut` is an unknown-potion temperament, so do not present it as a universal gas counter merely from its name.

## First delivery: measured catalogue

After the cohort releases the machine, record the exact baseline commit, runtime hash and source-save hashes. Retain earned saved towns for Fens, Crypt and Foundry. Public controls must actually permit and afford each tested choice; if not, record the missing access and earn it before claiming the comparison. Diagnostic fixtures are separate and clearly labelled.

1. Export two encountered compositions per biome: six actual scenes with route, depth, room/map, enemy positions, situation, current HP/kit, package levels, unlock state and relevant event trace. Retain unsuccessful attempts to find a contrast.
2. From each identical source state, compare the current configuration and two legal alternatives: eighteen baseline/choice cases across the six scenes. Keep gear, Legacy, party size, elapsed time and randomness matched. Changing a package must occur through a legal home choice, with its effects snapshotted for the actual send; do not equip into a historical fight.
3. Use the existing saved-session choice checker for next-absence consequences and actual run traces for tactical attribution. Do not interpret a generic eight-hour depth increase as proof that a particular fight was countered. Report survival/exit, secured and lost carry, damage by cause, action order and time separately.
4. Every scene needs at least one quoted actual event that explains its response. Require zero cases where the proposed counter is justified only by a label or a final aggregate number. If one configuration wins both scenes, report that result; do not advertise two defensible choices.

This catalogue is evidence for selecting a content change, not a balance certificate or a replacement for either blind rating.

## Implementation stage, only if the catalogue finds a gap

Start with two contrasting formations in one biome using the existing roster and placement system. Select the biome and specify the exact formation/counter from played evidence before editing Rust. Extend to the other two biomes only after the first stage passes. Preserve monster identity, named causes, public vocabulary, reachable stairs, manual town construction and absence safety. Do not add rewards or change item/drop RNG to make the demonstrations succeed.

Before implementation, add the formation-selection rate and tactical success thresholds to this contract using the baseline measurements. Those are currently unset; no implementation can be accepted without them. Preserve both losing and winning configurations and any failed gate. If migration or new replay metadata is necessary, define it here before changing saved-run behavior.

## Verification required for an implemented stage

- Placement catalogue: seeds1–12 across every valid `Route::all()` route, checking each eligible floor of the changed biome. Zero invalid/occupied placements, unreachable stairs, disallowed boss situations or broken flagship/stray/nonrepeat guarantees. Report the actual number of floors and placements; no implied coverage of excluded routes or tiers.
- Determinism: exact repeated replay hashes for all twelve catalogue seeds. Whole/sliced/reloaded next8h parity for one-hero and three-hero saved sessions, including an in-flight old save and a freshly sent run. Existing historical replays must remain truthful.
- Tactical attribution: both formations expose their actual threat and at least one legal response in the trace. All deaths in the comparison set retain cause, margin and cheapest available lever. Do not invent a player's written rule when the pen is locked.
- Visual evidence: matched400px phone and1440px desktop real-replay screenshots for both formations, with readable characters, hazards and telegraphs. Post them in the conversation. Preserve primitive fallbacks and the approved ink/wash direction.
- Iteration: targeted tuning rows first, then quick verification and the required current-game native/client gates after rebuilding the real WASM. Never weaken an invariant or a gate for more content. Existing routine native outpace failure and the separate targeted16-seed result remain distinct until a genuine rerun resolves them. No exhaustive-audit claim from the routine suite.

No tests, simulations, screenshots or new content are claimed delivered by this preparation document. Commit/push completed checkpoints under standing authorization; do not deploy.
