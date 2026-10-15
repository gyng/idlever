# Painted equipment figure — observations2026-10-16

These are dated engineering observations by the implementation/review agents,
**not player feedback or a blind fun verdict**. Native inputs remain genuine
public earned saves on WASM8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff.
Root generated/exported art; this lane generated no art and changed no native
state/rules. Exact final10export hashes are in `art/equipment.json`; root's
`root-fit-review-2026-10-16.json` pins its20personally inspected pictures.

Owner clarification relayed2026-10-16: “Paper doll can be more abstract to make
it easier.” Recognisable gear, clear slots and correct Actual/Next are the
priorities; anatomical/clothing/grip perfection is not required. This is owner
direction, distinct from the engineering judgments below. No further fit polish
or generation was undertaken after approval.

- `fit-v1/male-actual.png` and `male-next.png`: new full-canvas Hearthglass,
  boots and neutral body made the equipment readable, but existing Sword/Bow
  icon mounts visibly separated the grip from the right hand. Helmet hid most
  eyes/hair. Root and implementer rejected these mounts despite the capture
  protocol's functional PASS. Raw images, script and log remain.
- `fit-v2/owned-weapon-crownsplitter.png`: translated/scaled full-canvas Crown
  reaches the right-hand region, with a clearly broad/notched blade. Sword/Bow,
  Dagger and Axe grip mounts improved. Frost coat, hood and boots read as
  different equipment. But `owned-armour-leather.png`/`owned-armour-plate.png`
  show ordinary armour too low/small on the torso. Root rejected those four
  armour mounts; this phase's functional PASS is not final fit approval.
- `fit-v3/owned-armour-{leather,mail,plate,scale}.png`: individual uniform mounts
  now cover shoulder/chest/waist rather than float over the lower chest.
  Root approved these and the earlier seven wearables. All3public cosmetic
  looks are represented in the6look/phase crops; Cat retains a visible tail.
  Helm/hood naturally cover much of the hairstyle; no claim that every look
  distinction stays equally legible under every headwear combination.
- `fit-v3/isolated-unowned-{spear,mace,long_gun,short_gun}.png`: recognisable
  separate silhouettes, at the right-hand region; root reviewed all4. These
  are deliberately isolated production-component inputs, cloned locally from
  a slot-shaped build. They never alter the game's Session or grant ownership.
  They prove art fit only. Actual public owned-shape preparation covers15kinds.
- `guards/missing-base-hearthglass-primitives.png`: blocked base/body painting
  leaves a visible neutral primitive and role-specific armour primitive; other
  actual gear remains painted. The fallback is intentionally simpler than the
  painted figure and cannot be mistaken for final painted-quality acceptance.
- `painted-adoption/weapon-bow-402-2x-next-body.png`,
  `helm-empty-402-2x-next-body.png`, and
  `weapon-bow-1440-1x-next-body.png` were opened and inspected: the body is
  reachable by actual panel scrolling, Bow replaces Sword, and Next empty helm
  shows bare hair rather than a phantom helmet. Natural Engineer herald appears
  near the upper header in these diagnostics, without covering the figure.
  These are not advertised as overlay-free settled Home/Hub base screenshots.

The first8case acceptance protocol proves64canonical slot comparisons,
800phase switches,800refresh/focus records,32slot routes and exact saves. Its
`every(existing image)` readiness check alone was insufficient: removed failed
images could satisfy it vacuously. Root identified that coverage hole; the
original run/harness remain unmodified. Supplemental `painted-adoption` covers
all8layouts/16phases with explicit painted base, canonical look/exact href,
painted nonnull slots/exact href and0children/images at null slots, plus actual
whole-body rect inside visible panel bounds. It does not repeat stress loops.

This finishes a scoped painted Hub composition refinement. It does not close
R7 tree/progression expansion, all class/level/ownership combinations, browser
Safari, gameplay balance, final painted quality or fun. Four unowned shapes
have no new earned acquisition/first-send proof. The dungeon's baked class
weapon misreads documented by Cut246 are outside this Hub change. Prior full
Hub contrast/focus evidence is separate; this phase does not claim a new whole
menu contrast audit. Home's retained15semantic-functions/≤12 failure is unchanged.

Shelf life: preserve these as observations of pinned source/asset/runtime bytes.
Revalidate after base/item export, mounts, canonical look/equipment wire,
resident/incarnation lifecycle, Actual/Next phase handling, panel layout,
font/viewport policy, image loading or runtime changes. New art/engine/UI or
owner feedback can invalidate current fit conclusions; no calendar-only expiry
or static screenshot can establish future motion/gameplay quality.
