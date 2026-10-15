# Earned build replay visual review — 2026-10-16

Reviewer: implementation agent; **dated engineering observation, not player feedback**. All40 existing images in `weapon-surviving-targets-8879/results.json` were opened and inspected. No new gameplay, browser, state edits, source changes or asset generation were performed. Companion `visual-review-2026-10-16.json` records exact reviewed hashes.

The current pictures establish recognisable class bodies and usable hero location, but **do not establish selected-weapon visual truth or full R4**. The strongest concrete misses are the Ranger still carrying a painted bow with an actual Sword, the Caster carrying a painted staff with actual Dagger/Bow, and Short Gun retaining the long shoulder-gun silhouette. Crownsplitter also lacks a confidently distinct silhouette here. These are observed visual misreads, not claims that native equipment/attack resolution is wrong.

## Context and comparison limits

Input is `actions-8879.json` (not `actualactions-8879.json`); it inventories actual attacks, complete verbs, paid ownership and accounting on WASM8879ed11650ac52c6271527b457913a30f88ec4cf6c02f0d62e19d0ba9081dff. Capture metadata dates2026-10-15T20:04:59Z. These are standalone production viewer captures, with the first landed hero attack **whose victim survives that tick**, paused at attack tick+2; they are not live Watch UI or a motion study. The original40 `weapon-frames-8879` first-attack pictures, often with dead victims, remain weaker diagnostics and are not substituted for these observations.

Every branch has GL/Canvas ×402×681/1440×900. GL uses baseTexels100 at both widths: phone agrees with the actual phone bridge; desktop actual bridge72 differs. Canvas uses its default framing. GL actors are visibly larger; Canvas shows more terrain. This is not a matched-zoom parity comparison and cannot certify current live desktop framing. No runtime/FPS/cost claim follows from these screenshots.

Fighter is classL8 and the other tested classes are L1. Preserved packages show no Fighter shield_bash/cleave/taunt/second_wind/bulwark or Caster bolt/ward/blink/slow/nova/drain firings. Actual Bow projectile and Gunner fire/reload inventory are meaningful native differences; ten loadouts are not ten demonstrated signature-skill builds. Branch turns/rooms/targets diverge, so these are not same-enemy damage comparisons.

## Inspected branches

Paths below are under `weapon-surviving-targets-8879/`. Each prefix means all four exact files `PREFIX-gl-402.png`, `PREFIX-gl-1440.png`, `PREFIX-canvas-402.png`, `PREFIX-canvas-1440.png`; representative filenames are named explicitly for strongest observations.

| Prefix; native attack tick/verb | Observed reading across inspected images | Remaining uncertainty |
| --- | --- | --- |
| fighter-sword;9238/attack | GL hero ring/HP locates the silver/red fighter amid a crowded boss doorway. Nearby Warlord/other silhouettes and bars compete. Canvas gives room context but shoulders overlap. | No isolated hit cue is confidently readable in this still; proximity does not identify eventdst69 as the Warlord. |
| fighter-crownsplitter;6386/attack | Captain/goblin stack in a narrow doorway above the hero. A narrow blade/arm and nearby torch are readable, but no unique broad Crownsplitter shape is evident. | Does not demonstrate weapon-specific strike identity. |
| rogue-dagger;2813/attack | GL cape/rim and marker separate the rogue from the archer southwest. Canvas has a small brown/red rogue and tiny blade. The archer's thin surviving bar helps locate nearby combat. | Generic pose is not proof of a Rogue active skill or a readable dagger hit animation. |
| rogue-crownsplitter;5829/attack | GL conjurer label and almost-empty bar remain legible; allies crowd the other side. Canvas still reads a small blade-bearing rogue. | Crownsplitter is not confidently distinguishable from the ordinary rogue silhouette. Edge actors are not automatically the actual attack victim. |
| ranger-bow;5050/shoot | Ranger bow silhouette is visible; GL marks the hero beside an ally, Canvas shows more chamber. | Victim is not visually identifiable in these four stills; no confident projectile-to-target connection or distance reading. |
| ranger-sword;5088/attack | **`ranger-sword-canvas-1440.png` still clearly shows a curved bow in the hero's hand**; GL also reads as bow/cape amid captain/goblin crowding. | Selected Sword attack has no visually honest Sword silhouette here. |
| caster-dagger;2813/attack | **`caster-dagger-canvas-1440.png` reads as a robed staff-bearing mage**, as does the enlarged GL silhouette, despite native melee Dagger. | Robe/staff appearance must not be mistaken for a recorded spell firing. |
| caster-bow;5050/shoot | **`caster-bow-canvas-1440.png` retains the raised staff**, without a distinct drawn bow; GL similarly reads robe/staff with strong hero locator. | Bow shooting is native evidence, not visible selected-weapon proof; victim unidentifiable in the still. |
| gunner-long_gun;9938/fire | Long horizontal shoulder gun and red coat are readable in `gunner-long_gun-canvas-1440.png` and enlarged GL. No victim is identifiable in these stills. | No confidently identifiable muzzle flash/impact or target connection at tick+2. Does not prove the effect never plays. |
| gunner-short_gun;6400/fire | **`gunner-short_gun-canvas-1440.png` and `gunner-short_gun-gl-1440.png` retain essentially the same long shoulder-gun pose**. Nearby rat/goblin silhouettes/bar labels frame the hero. | Short Gun is not visibly distinct from Long Gun. Nearby named actors need not be the fired-at victim. |

## Cross-backend observations

GL pooled warm light, rim/ground marker, HP bars and named actors make the hero easier to locate immediately in these images. Crowded doorways can stack labels, bars, silhouettes and floor/biome text; bright torch/marker pixels near hands complicate small weapon reads. This is qualitative inspection, not measured contrast or a demonstrated clipping defect.

Canvas preserves legible terrain and full actor silhouettes at a smaller scale, but the phone presentation loses small weapon detail and does not show the same GL label/locator treatment. Its broader map view does not guarantee a ranged victim is in view or legible. `gunner-short_gun-canvas-402.png` visibly fits the close rat/ally grouping, while the long-gun capture has no identifiable victim. These observations are not an assertion of identical information or effect parity.

A surviving native target is a better capture criterion than a corpse, but it does not guarantee an in-frustum, revealed or visually distinguishable target. Without mapping the actual eventdst into the viewer's visibility/projection at that instant, this review records unlocated targets rather than inventing an offscreen coordinate. Root's separate data-based offscreen finding is not reproduced as a visual measurement here. A single tick+2 still can miss a brief slash, tracer, muzzle flash or recoil, so absence in the inspected still is **not proof of absent animation**.

## Next proof and shelf life

1. Make body/held equipment composition honest for actual sent weapon, including clear Short/Long Gun and Crownsplitter silhouettes; avoid drawing a second weapon over a baked conflicting weapon. Keep primitive fallback and canonical sent owner/gear truth. The separate Hub neutral paper-doll prototype does not repair dungeon class sprites.
2. Inspect a short actual event neighbourhood for melee/shoot/fire/reload, with recorded source/target positions, visibility, camera bounds and effect lifetime. Separate close/long range, visible/offscreen victim and same-tick death cases. Do not retime native events merely to obtain a readable frame.
3. Revalidate in actual phone402×681 and desktop1440×900 Watch at their real bridge scales, and both backends; retain standalone captures as diagnostics. Test class-specific verbs only from actually earned/adopted eligible builds.

This review applies only to the40 exact bytes and metadata listed in its companion manifest. Revalidate after class/weapon art, equipment composition, atlas, effect timing, renderer labels/visibility/camera/zoom or actual Watch bridge changes, and after a new runtime/replay cohort changes the chosen attack. Historical pictures remain valid observations of their pinned build; no fixed calendar expiry makes them current for changed code. No full R4, UI acceptance, counter superiority, balance, player preference or fun-rating pass is claimed.
