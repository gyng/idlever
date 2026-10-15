# Retained content catalogue — earned records, pinned source inventory

Checkpoint before Cut242 (`f62d31c2`): the generic-prop gap documented below
was subsequently resolved by six integrated themed replacements; see
[Cut242 final proof](../cut242/README.md). The old atlas crops/source hashes
remain historical evidence. Semantic landmarks and causal encounter/loadout
comparisons remain open. Re-running scripts now observes the newer art; it
does not reproduce the pre-Cut242 pixels without its pinned source.

2026-10-15. Read-only preparation for retained R3/R4/R6; no new gameplay,
grants, source edits, balance pass or performance claim. One saved genuine
departure capsule is reconstructed through the existing read-only replay API.
Reproduce from repository root with
`python3 docs/evidence/handoff-content/catalogue.py` (Python3 + Pillow).

`six-scenes.json` identifies six actual stored encounter checkpoints, enemy
coordinates/HP, terrain counts, kit, compiled rows, vocabulary and original
ten-action traces. Each `.record.json.gz` preserves its exact original DeathRec,
including the serialized `t10` Run/map and full trace. The `.svg` files are
fogged schematic checkpoint maps, **not production screenshots**. Their numeric
map/positions are useful even where a sprite is invisible at that checkpoint.
`existing-materials.png` is an inspected current asset contact sheet, **not a
composed dungeon scene or new art**. `source-assets.json` pins current source
and97 existing biome-material files; it does not pin a new engine run.
`packed-prop-crops.png` shows authoritative current atlas crops8×;
`packed-prop-mapping.json` identifies all9 manifest IDs, renderer keys, exact
atlas rectangles, source/crop hashes and pixel equality to the original tiles.

## What was actually encountered

All six records come from existing earned Cut162 AWAY-nodes seed1/2 saves.
`docs/CUT162_AWAY_CHECKINS.md` records their historical runtime
`src3237241c9c6bb7af`,56 earned camps and byte-identical completed recaptures,
without grants or worker/rule edits. These are historical encounter evidence,
not current87de balancing or same-save counter comparisons. Exact source paths,
gzip SHA256 and raw record SHA256 are in the JSON. Actual entrance notes name
the biome; an assumed fixed depth never substitutes for route evidence. The
historical Run does not serialize route bits or package training levels at send.
Later camp ownership/levels are deliberately not copied backwards.

| Case | Exact existing composition/checkpoint | Actual retained event/state | Counter still to measure |
|---|---|---|---|
| F1 gas | AWAY-nodes s1 day3 run79, D13 Fens, shrine;0 rooms,124 water tiles;9/15 HP.7 living bloats + Mother,2 archers,1 jelly | Twelve gas blows in final trace; t14400 gas3 HP11, t14410 gas3 HP8. `drink heal`, `attack tag:boss`, then `bank` actually fire. | Earned gas_step versus pack_break at recorded levels; iron_gut was active here and did not prevent gas loss. No claimed winning counter. |
| F2 water/pack | s2 day3 run84, D13 Fens, nest;0 rooms,36 water tiles;21/39 HP.2 eels,5 jackals,1 archer | t5634 two eel5 blows; t5641 jackal1; t5647 jackal1. Mother already slain at t5320. `attack nearest` persists. | pack_break/positioning versus gas_step; prove actual corridor availability in a cellular cave and legal departure choice. |
| C1 drain | s2 day5 run167, D18 Crypt, shrine;22 rooms,94 doors,1 chasm;10/10 checkpoint HP.2 wraiths,3 skeletons,2 conjurers,1 ghoul + Lich | Recorded maxHP16→5 across ten actions; wraith blows at t15834 and t15851; `attack tag:summoned` at t15868. Earlier D15 note: “The floor is hungry. Light keeps it back.” | Separate direct wraith/Lich drain from hunger. Lantern/shrine blocks hunger; current `ai.rs` still drains on wraith damage. Do not promise lantern immunity to wraiths. Current legal preparation/target alternatives unverified. |
| C2 summoned pack | s1 day3 run92, D18 Crypt, nest;12 rooms,44 doors,1 chasm;16/29 HP.11 skeletons,1 conjurer,1 wraith,1 bloat,4 jackals | Eighteen skeleton blows in trace. Lich slain t24738, then skeleton kills hero t24819; t24816 `attack nearest` at2 HP. | Legal summoner targeting/corridor retreat, versus the actual baseline. Surviving the boss alone did not resolve the pack. |
| W1 reflector | s1 day4 run102, D20 Foundry, shrine;12 rooms,40 doors;19/33 HP.2 golems,2 smiths,3 imps,2 sentinels | t25766/25779 golem blows; t25804 `attack nearest` at1 HP. One golem and smith have saved `buff_def=[3,8]`. | reflect_read versus support priority; golem-attributed damage does not distinguish ordinary blows from reflection. Need actual reflection event/action attribution, not tag alone. |
| W2 support candidate | s1 day4 run118, D23 Foundry, shrine;13 rooms,47 doors;24/44 HP.7 smiths,6 imps,1 crawler,1 golem + Master | Master and six smiths have saved armour3 with20 ticks left (another smith10); t32546 “master hammers”; t32521 Master2 damage. | Active support armour is observed state, but no retained “armours” or sentinel “bell!” event. Boss is historical tier0/brood, so do not attribute all extra enemies to the plain Foundry roster. Distinct priority counter remains unproved. |

These are six **encountered candidates**, not six accepted contrasts. All are
Fighter and historical Guarded; zero of the18 legal baseline/choice forks were
run here. Exact compiled rows survive; package levels, legal alternatives and
original send camps are missing. No retroactive package equipment is permitted.

## Delivered current systems and the actual gap

Current `gen.rs::layout_for` already supplies cellular/water Fens with40% mere
variant; Crypt cross/pillar/rect rooms or small catacombs, loops and chasms;
Foundry pillar/rect works or halls. `descent.rs::Route` swaps biome bands and
already supplies bosses, heir affixes and visiting champions. These are existing
deliveries, not missing generators. `situations.rs` already places den, captive,
nest, shrine, cache, stray, hunger and lock where eligible. FENS_POOL excludes
lock; current Foundry room pool excludes hunger. Historical records contain
Foundry locks: that is source drift, not permission to introduce them now.

Current rosters establish threats: Fens gas bloats, water eels and fast pack
jackals; Crypt drain wraiths, paralysing pack ghouls, conjurers/summons and Lich;
Foundry melee-reflecting golems, alarm sentinels, armour-support smiths, fire
imps/crawlers and Master. Current `ai.rs` implements sentinel sight→alert+2,
floor-wide noise40; smith armour+3/30 ticks; Master support+2/40 ticks. These
are source facts, not measured advantages of a chosen package.

`packages.rs`/`meta.rs` already implement gas_step, pack_break, mirror read,
corridor fighting and targeting. gas_step/pack_break gain level3 rows. Hunter
already invokes mirror read and prioritizes ranged/summoned/boss targets,
adding caster priority at level3: it could win both Foundry scenes. The next
comparison must retain that result if it occurs. No new tactic is justified by
this audit alone.

R3 still needs original/current earned legal send states for each paired scene,
training/unlock/affordability snapshots,18 identical-source baseline/two-choice
cases, event-based causal attribution, and all unchanged CUT136 placement,
determinism, one/three-resident whole/sliced/reloaded and current-game gates.
Formation selection rates and success thresholds remain unset; this audit
does not choose a biome implementation or lower those requirements.

## Existing environment art versus R6 landmarks

Current atlas lookup is biome-specific (`atlas.ts::envTile`), with shared and
primitive fallbacks.97 material files exist:37 Fens,30 Crypt,30 Foundry. They
include floors, wall faces/tops, doors/stairs, water/chasm and small props.
`index.ts::dress` already adds Fens reeds/lilies, wet-edge growth, stump/log,
lantern/ruin, corners, bones and rare open-room braziers. Shrine/cache/nest have
mechanical identities and frames. None should be queued again as absent.

The inspected contact sheet shows teal Fens, violet Crypt and warm Foundry
materials, but common barrel/jar/rack silhouettes are still very similar.
`ART.md` promises stump/fish trap/mossy jar, sarcophagus/coffin/urn and
anvil/coal bin/crucible treatments; those names describe generic asset slots.
The actual packed crops confirm that the six barrel/crate slots remain barrel
and box silhouettes, despite those specific themed substitutions in approved
direction. Existing pots plausibly cover jar/urn/crucible; do not label those
missing by filename alone. Manifest IDs/files all exist and their atlas pixels
match the current tiles exactly: this is a thematic painting gap, not an asset
loader/manifest failure. No new art generated here. A new small-prop treatment
would still not alone prove three recognizable room landmarks.

R6 still needs three concrete, distinguishable landmark treatments tied to
actual generated layout; matched real-replay400/1440 GL/Canvas views with
characters/hazards/telegraphs, primitive/asset-failure behavior, and separate
cold-load/warm-GPU measurements. No cost or readability pass is claimed under
the concurrent native workload.

## R4 class/loot boundary

`hero.rs::Class::ALL` is Fighter/Rogue/Ranger/Caster/Gunner; earned Clown and
Engineer are additional and cannot replace those five cases. Existing class
actions, skill nodes, saved starting kits, Gear/Skills surfaces and real earned
Gunner/Hybrid fixtures are delivered. This six-scene export covers one class
and zero paired loadouts. Ten earned affordable loadout cases (two per original
class), exact purchase/upkeep/action/outcome ledgers and retained losses remain
missing. UI/icon coverage or a gear inventory is not that proof. No new item,
drop RNG or replacement rule has been proposed.

## Bounded current-runtime replay and its limits

The existing current menu fixture is earned and its one-hour preparation used
87de WASM without grants; provenance is linked in
`current-camp-replay-availability.json`. Its retained D13/D18/D23 deaths do not
establish that those historical fights happened during the latest hour. The
historical Cut162 saves have no retained replay capsules. The current menu
save does preserve two genuine send capsules under the serde key
`live_capsule` (runs131/132), despite its empty ordinary `history` array.
`replay.mjs` loads it with the existing frozen87de WASM and calls
`Game.replay(131)` once:28 floors,30,689 reconstructed ticks versus33,697 in
the historical runlog. **The mismatch is retained; historical bit identity is
not claimed.** Exact parent save is unchanged before/after this read-only call.
`run131.replay.json.gz` contains the complete returned Snapshot/event stream;
`run131-summary.json` pins WASM/input/save hashes and all actual threat events.

The reconstruction contains gas overlays, Crypt `max_hp cause:drain`, spectral
blade spawns, Foundry `bell!`, `armours`, and `attack verb:reflect` events.
These establish current-runtime delivered behaviours from a genuine saved
departure, not superior preparation choices or the original historical events.
`capture.mjs` creates a fresh isolated Vite server, uses the private GPU through
`tools/browser.mjs`, loads these returned floors in the production GL/Canvas
viewers and seeks actual event ticks. Frames and served-source identity are
recorded in `capture.json`; no gameplay runs in that browser. They are renderer
review evidence and must retain the reconstruction label. No timing/cost pass,
18-choice comparison or current balance gate is implied. No handoff/queue
completion state was changed.

Actual current-runtime capture anchors (run131): gas overlay D10 t11600;
jackal attack D13 t13870; drain `max_hp` D14 t15290; spectral-blade spawn D17
t18720; reflected attack D21 t22650; nearby smith `armours` D20 t21960.
Each is shown at event tick+2, with the production renderer's ordinary fight
camera, at400/1440 in GL and Canvas:24 final frames. `review-gl.png` and
`review-canvas.png` collect all24 views; `frame-inventory.json` pins original
dimensions and PNG SHA256. Run `python3 .../review.py` to regenerate sheets.
GL phone images were also inspected individually: gas/bloat, jackal contact,
golem/crawler and two nearby smiths are visibly present. The Canvas sheet
shows the same scene states through its simpler presentation; it is not proof
of identical lighting, label/telegraph readability or final landmark acceptance.

The first pack still caught an eel before jackal contact; the first support
event occurred outside the ordinary fight camera. Those8 GL/Canvas400/1440
attempts survive as `initial-replay-*.png`, with `capture-initial.json`.
The refined8 frames use actual jackal and nearby smith events;16 other rows
are retained from the original current-source capture. Initial off-camera
stills do not count as visible pack/support evidence. The first sandboxed
server launch failed with local-listen EPERM (`capture-sandbox-denied.err`);
the approved isolated-server run succeeded. All owned browsers/servers exited.
