# R3 pricing: which of the six scenes a real earned absence actually meets (2026-10-16)

`docs/evidence/mechanics/r3-biome-review-2026-10-16.md` §5 says the six proposed pairs
cannot be scheduled until someone prices the one thing the plan assumes: **the chance a
single new earned camp meets a named scene in one absence**. The preserved earned chains
can answer a first version of that, because the reconstructions carry the wire's own
`overlay`/`spawn`/`die` events (`Ev::Overlay { ov }`, `spawn.e.kind`) — the hazard
telemetry exists even though per-tick positions and per-tick attribution do not.

`docs/evidence/mechanics/r3-scene-encounter-pricing.mjs` scans the 565 preserved
reconstructions of the 13 recorded chains (5 of cohorts-v2, 8 of continuations-v3, all
three branches each) and records, per chain, how many of its runs contain each marker
(the files are pretty-printed; the needles carry the JSON spacing).

| R3 scene | marker | chains meeting it | per-chain run hits |
|---|---|---|---|
| P1 gas | `"ov": "gas"` | **13/13** | 8–31 of 26–60 runs |
| P2 pack | `"kind": "jackal"` | **13/13** | 3–56 |
| P2 pack | `"kind": "ghoul"` | **12/13** | 1–27 |
| P2 pack | `"kind": "eel"` | 3/13 | 2–55 |
| P3 drain | `"kind": "wraith"` | **12/13** | 9–51 |
| P3 drain | `"kind": "lich"` | 3/13 | 3–13 |
| P4 summon | `"kind": "skeleton"` | **13/13** | 7–32 |
| P5 reflect | `"kind": "iron_golem"` | 3/13 | 4–11 |
| P5 reflect | `"kind": "warden"` | 13/13 (class-name confound) | 9–54 |
| P6 support | `"kind": "smith"` | 13/13 (name confound) | 3–27 |
| P6 support | `"kind": "acolyte"` | **13/13** | 3–46 |
| P6 support | `"kind": "warlord"` | 0/13 | — |
| bell | `"kind": "bell"` | 13/13 (tool confound) | 5–47 |
| control | `"ov": "fire"` | 8/13 | 1–37 |
| control | `"kind": "mirror_shade"` | 13/13 | 9–44 |
| control | `"kind": "lurker"` | 4/13 | 5–11 |
| control | `"kind": "ogre"` | 13/13 | 2–56 |

Monster identity is confirmed in the core: `eel` (`tags: ["water"]`), `iron_golem`
(`tags: ["reflect_melee"]`), `smith`, `warden`, `acolyte` are all `MonsterDef` rows
(`crates/idlever-core/src/defs.rs`) with per-kind AI (`crates/idlever-core/src/ai.rs`).

## What this prices

- **Common scenes are met every time.** Gas, jackals/ghouls, wraiths, skeletons,
  smiths/acolytes, ogres and mirror shades appear in essentially every recorded chain, so
  a *single* new earned absence can plausibly re-encounter P1, P2 (pack), P3 (drain), P4
  (summon) and P6 (support).
- **Rare scenes are ~23 %.** `eel`, `lich` and `iron_golem` each appear in only 3 of 13
  chains. A pair keyed on an eel, a Lich or an iron golem needs **several sends, or a
  designed encounter**, before it can be met at all — and P5's reflect pair is better
  keyed on a monster that is actually common (warden/reflect exists 13/13) than on the
  iron golem the review named.
- **`warlord` never appears** in the record, so nothing should be keyed on it.

## Limits (read before quoting)

- Presence is **not** proof the mechanic fired: an eel spawning is not the water-pack
  combo, and a `die.cause` was not attributed to these scenes per tick.
- Some marker names are shared with class branches, items, tools and facts (`warden`,
  `smith`, `bell`), so those counts are **upper bounds**; the monster-only names (gas,
  eel, lich, iron_golem, wraith, jackal, ghoul, skeleton, acolyte, ogre, mirror_shade)
  are the trustworthy ones.
- These are the *frozen* 13 chains used for Cut253/255 evidence, not a fresh sample;
  re-measure before using the numbers to justify new work (owner amendment 2026-10-16).
