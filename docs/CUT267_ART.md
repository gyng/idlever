# Cut267 — boss chest, clone-vat states, achievement badges, R4 weapon sprites, town walk alternates

Owner, 2026-10-18: "codex is back up, so generate any missing assets you need." Art only: no Rust, game rules or
gameplay UI changed. Wiring the chest, vat and badges into the game belongs to other cuts (the chest reveal, Cut264,
Cut263 achievements); this cut makes sure every asset is generated, reviewed, packed, registered and loads.

Base: `main` 9117a8b2, branch `cut267-art`. Tool: `codex exec` (codex-cli 0.163.0, config model `gpt-6.1-sol`) with its
built-in `image_gen`; every batch ran detached (`setsid nohup`). Prompts are composed by `art/cut267_prompts.py` (the
approved STYLE preamble from `art/prompts/town_clone_vat.txt` plus per-batch rules) into `art/prompts/cut267_*.txt`; the
job list with every brief is `art/staging/cut267/generation-jobs.json`. Selected candidates are promoted by
`art/cut267_promote.py`. Candidate originals stay untracked in `art/staging/cut267/<set>/` (as for earlier sets); the
review sheets, the load check and the job list are committed.

## 1. Boss chest (`art/ui/fx/`, packed by `tools/ui-skin.py`)

Prompt `art/prompts/cut267_boss_chest.txt`; review `art/staging/cut267/review-chest.png` (painted 256 px row and the
`_px` pixel cut, 4× nearest).

| id | what | shipped files |
|---|---|---|
| `chest_boss_closed` | frame 1: iron-bound UMBRA/DUSK oak chest, GILT corner caps, BLOOD crown seal | `ui/fx/chest_boss_closed.webp` 256², `_px.png` 50² |
| `chest_boss_cracked` | frame 2: hasp burst, lid lifted, BONE/GILT light blades leaking from the seam | `.webp` 256², `_px.png` 50² |
| `chest_boss_open` | frame 3: lid thrown back, heaped GILT coins, stepped light column | `.webp` 256², `_px.png` 50² |
| `chest_fx_rays` | 16-ray light burst, radially symmetric (rotate it), neutral pale | `.webp` 256² (no `_px`) |
| `chest_fx_ring` | neutral glow ring, plus `chest_fx_ring_{common,uncommon,rare,epic,legendary}` tinted to the §7 rarity *lit* pigments | `.webp` 256² each (no `_px`) |
| `chest_fx_sparks` | particle sheet 4×2 cells: coin spin ×4 (face, ¾, edge, ¾) and sparkle ×4 (grow, peak, fade) | `.webp` 256×128 (64 px cells), `_px.png` 66×34 |

- **Why `art/ui/fx`, not the atlas.** `pack.py` crops every keyed sprite to its alpha bounds, so a closed chest and an
  open one (lid and light above) can never pack to the same size, and it binarises alpha and inks the edge, which
  destroys a glow. `art/ui/fx` keeps the 1024 canvas per family, so the three chest frames share one size in both
  registers (256² painted, 50² pixel cut) with the body in the same place (measured on the sources: bottom edge
  y 878–882, lower-body x 456–746 in all three). This is the same path as the boss shield (`tags.ts`).
- Glows (rays, ring) were painted on flat black and converted to straight alpha from brightness (`glow()` in the
  promote script); the rarity rings are tints of the neutral ring with only the brightest core kept white. Their `_px`
  cut is skipped in `tools/ui-skin.py`: the hard-alpha pixel cut flattened them to an identical white stencil.
- Choice: single candidate set; all six accepted. The cracked and open frames are image edits of the closed frame.
- Fallback for the wirer: these files are listed in `web/src/ui/skin.json` `fx`; the consumer must check that list (as
  `tags.ts` does for `shield`) and draw a code primitive when absent.

## 2. Clone vat states (atlas, `art/generated/`)

Prompt `art/prompts/cut267_clone_vat.txt`; review `art/staging/cut267/review-vat.png` (idle, active_0, then the four new
frames). Each new frame is an image edit of `town_service_device`; `cut267_promote.py vat` then pastes only the glass
region (x 590–945, y 215–605 of the 1536×1024 master) onto the idle master, so the cap, hoses and plinth are pixel-identical.

| id | brief |
|---|---|
| `town_service_device_grow_0` | dim fluid, a small curled seed form low in the tank, two feed tubes |
| `town_service_device_grow_1` | MIST-lit fluid, a half-height curled figure, thin BLOOD vein |
| `town_service_device_grow_2` | bright MIST, full-height upright figure, BLOOD vein, many bubbles |
| `town_service_device_ready` | drained clear glass, wet streaks, front glass hatch swung open, no figure |

All seven vat frames pack at **215×144** and so draw at 54×36 (CUT236 3-frame rule extended to seven). The renderer's
existing fallback in `web/src/render/home-service-art.ts` matches `id.includes("_device")`, so every new id already has
the primitive vat. Registered in `art/manifest.json` (copy of the vat entry's kind/size fields).

## 3. Achievement badges (`art/ui/icons/`, 256² RGBA → 96² in `web/public/ui/icons/`)

Prompt `art/prompts/cut267_badges.txt`; review `art/staging/cut267/review-badges.png` (160 px and a 32 px box read on
dark and on moss ground). All share a 220 px outer footprint on the 256 canvas.

| id | use |
|---|---|
| `badge_frame_bronze`, `badge_frame_silver`, `badge_frame_gold` | tier rims with an EMPTY dark centre well (~120 px) for the achievement's own glyph |
| `badge_bronze`, `badge_silver`, `badge_gold` | complete tier medallions (star in laurel) |
| `badge_secret` | hidden tier: INK iron, AMETHYST sheen, a half-closed eye sigil (no letters) |
| `badge_locked` | dim UMBRA silhouette with a small padlock |

Listed in `skin.json` `icons`; the skin's `<img>` already falls back to a CSS glyph (`data-glyph`) when an icon is absent.
Bronze uses VERDIGRIS in its recesses, silver MIST/MOON, gold GILT with a sunburst rim, secret AMETHYST: the §7 pigments.

## 4. R4 dungeon weapon identity (atlas, `hero_<class>_<look>_<weapon>`)

Prompts `art/prompts/cut267_weapons_{a,b,c}.txt` and the retry `cut267_weapons_dagger_v2.txt`; review
`art/staging/cut267/review-weapons.png` (rows: ranger sword + caster dagger v1, caster bow + gunner short gun,
caster dagger v2 + crownsplitter) and `review-dagger-v1-rejected.png`. Each is an image edit of the accepted look master.

| ids (× male, female, cat) | weapon | packed |
|---|---|---|
| `hero_ranger_<look>_sword` | arming sword held forward-low; no bow | 68–72×96 |
| `hero_caster_<look>_dagger` | **v2**: long leaf-bladed dagger raised forward, clear of the robe; no staff | 67–78×96 |
| `hero_caster_<look>_bow` | recurve longbow at full draw; no staff | 68–70×96 |
| `hero_gunner_<look>_short_gun` | one-handed flintlock pistol at arm's length; no shoulder gun | 69–72×96 |
| `hero_fighter_<look>_crownsplitter` | two-handed GILT-LEAF great axe, split-crown blade, BLOOD gem | 72–82×96 |
| `hero_rogue_<look>_crownsplitter` | the same axe in the rogue's crouch | 73–82×96 |

Choices: caster dagger v1 (held reversed at the hip, as briefed) disappeared against the robe at 48 px; v2 makes the
dagger a separate bright spike beside the figure and replaces it. All other first candidates accepted. Crownsplitter
is painted for Fighter and Rogue, the two classes in the Cut246 evidence; other non-Gunner classes can also hold it
and still show their class weapon (not painted here). As with every hero, `pack.py` fits the full alpha box to 96 px,
so a weapon raised above the head (axe, raised dagger) draws the body slightly smaller than the bare look.

**Not wired.** The renderer still draws `hero_<class>_<look>`; selecting the weapon sprite from `Snapshot.weapon`
(fallback chain `hero_<class>_<look>_<weapon>` → `hero_<class>_<look>` → `hero_<class>` → procedural) is
render code for the R4 cut. R4 itself (actual Watch captures at real bridge scales) remains open.

## 5. Town walk alternates (atlas, `walk_<class>_<look>`)

Prompts `art/prompts/cut267_walk_{a,b}.txt`; review `art/staging/cut267/review-walks.png`. Each is an edit of
`walk_<class>` re-dressed as `hero_<class>_<look>` (the job attaches both references).

`walk_fighter_female`, `walk_fighter_cat`, `walk_rogue_male`, `walk_rogue_cat`, `walk_ranger_male`, `walk_ranger_cat`,
`walk_caster_female`, `walk_caster_cat`, `walk_gunner_female`, `walk_gunner_cat`, `walk_clown_female`, `walk_clown_cat`,
`walk_engineer_female`, `walk_engineer_cat` — 65–73×96, all first candidates accepted. These are exactly the ids
`townWalkIds()` (`web/src/render/town-volume.ts`) already requests first, so they take effect on pack with no code change;
an absent one still falls back to the idle pose and `walk_<class>`.

## QC and load check (2026-10-18)

- `python3 art/pack.py`: 561 frames, atlas 1024×3509 (sha256 3e6443f2c6d7…).
- `python3 art/art-qc.py`: **0 failures**, 1 warning. Before this cut, HEAD already failed with 99 "unregistered
  generated sources": the class-skill/advanced-skill/equipment exporters keep their own registries. `art-qc.py` now
  reads those three registries, and the 17 superseded or unselected `_v<n>` versions beside a registered version
  (cited by exact path in docs/evidence/cut220, cut253 and cut254) are a warning, not drift.
- `python3 art/review.py <36 new ids>`: corners/alpha true for all, 0 enclosed pure/near key pixels, no `CHECK`
  flags; `art/qc/review.png` is the runtime sheet over all seven biome floors for the 36 new atlas ids.
- `node art/staging/cut267/check-load.mjs` (headless Chromium via `tools/browser.mjs`, no desktop window): **PASS**:
  39 atlas frames inside the atlas with visible coverage, 23 UI files decoded, vat sizes `{215×144}`, 0 page errors.
  Strip `art/staging/cut267/load-check.png`, data `load-check.json`. This shows that files load and decode. It is not
  a render, FPS or Watch acceptance.
- `tools/ui-skin.py` re-encoded four unrelated `ctl_*` icons byte-differently; those were reverted.

## Observations, 2026-10-18 (agent visual review; not owner or player feedback)

Build/source: `cut267-art` on 9117a8b2 plus this cut's uncommitted art. Inputs: the review sheets above, viewed on a
desktop at sheet scale and as 32–48 px box downscales; no device, no phone viewport, no live game. Confidence moderate
for silhouette reads, low for in-context feel.

- Chest: closed and cracked frames read at 40 px as a chest. At 40 px the cracked seam and the open frame's coin heap
  and light column are the strongest cues. The GILT is warmer and more saturated than the dungeon's tinted sprites,
  which suits a reward. In motion the rays may need the wirer's alpha/scale tuning.
- Vat: growth reads as a progression at 36 px mainly by glow level; the seed (grow_0) is small and reads as "something
  inside". The ready frame reads as empty with an open door.
- Badges: the tier read comes from rim colour and the gold's spikes; the locked padlock is legible at 32 px. They are
  smoother and less pixel-stepped than the oldest icons.
- R4: sword, bow, pistol and crownsplitter are unambiguous at 48 px on both grounds. The dagger v2 reads as a small
  spike, still the weakest of the six.
- Walk alternates: cat ears/tail and long hair or short hair survive at 40 px. Colours of a few (fighter female)
  are slightly redder in the armour than the idle master.

Revalidate these after any wiring, display-size, tint or atlas change. They are dated engineering observations.

## Skipped

- Paper-doll mounts V3: needs an owner decision (instruction).
- Gunner ability V2 selection: needs no generation (instruction).
- Skill-polish redraws (item 5): not started. Adopting a redraw goes through `export_advanced_skills.py --library`,
  the 72-icon matrix and pinned source/prompt/export hashes. That is a separate integration step from this art batch,
  and it is the next candidate now that quota is available.
- Crownsplitter for Ranger, Caster, Clown and Engineer, and weapon variants beyond the four Cut246 misses (axe, spear
  and mace for every class), were not in the R4 evidence.
