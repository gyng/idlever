# Cut236 — fill the pending art library

Owner request, 2026-10-15: read the handoff, generate placeholder/missing assets,
then continue checking for other gaps. Visual work only; Rust and game rules stay unchanged.

## Contract

- All 7 classes × 3 looks have a sprite master and portrait; 7 default town walk poses.
- All manifest sources exist; art QC has zero failures, including alpha, outline,
  source dimensions, atlas bounds/gutters and colour counts.
- All 3 clone-vat frames have identical packed and drawn dimensions.
- At 400 and 1440px, packed services and retained code fallbacks render with no
  page errors. Full/Low/Off/reduced retain exact saves; Guild/pool relief remains
  mapped where enabled; context loss switches to 2D without changing the save.
- Retain primitive fallbacks, class look preservation and all existing gameplay gates.

## Delivered

The original seven prompt sets produced 24 unique assets: six Clown/Engineer
sprites, six portraits, two insignias, two deployed tools, bench/lantern,
three vat states and Guild/pool/station. Four default aliases copy the male masters.
Follow-up produced seven more: Gunner female/cat sprites and portraits plus
default Gunner/Clown/Engineer walk poses. The final vat replaces the first narrow
candidate. All 31 final assets and four aliases are wired into the atlas/UI skin.

Masters live in `art/generated/` and `art/ui/{portraits,icons}/`.
Built-in imagegen was used throughout. Original prompts remain in `art/prompts/`;
briefs and follow-up prompts are in `art/staging/generation-jobs.json` and
`art/staging/generation-followup.json`. Candidate originals and preview sheets
remain in `art/staging/`; these are not runtime dependencies.

The service proportions differ from the prompt targets. Packed width/height:
vat 215/144 (target 1.222), Guild 166/168 (target 1.5), pool 151/88 (target 2.636),
station 48/24 (target 3.333). Accepted visual deviations: the vat's wide machinery
plinth reads clearly as a cylinder, the tall Guild gable stays distinct, and the
pool/pad remain legible in their existing locations. Their actual atlas dimensions
drive the renderer; no stretching or gameplay footprint change was introduced.
All vat frames draw at 54×36, so the active loop retains the same dimensions.
No claim of pixel-identical external shell paint or a blind art rating is made.

## Evidence and limits

- `python3 art/art-qc.py`: 525 frames, zero warnings/failures.
- `python3 art/review.py`: final new sources pass corner/key checks; runtime
  composite sheet at `art/qc/review.png` reviewed across seven biome backgrounds.
- `art/staging/check-services.mjs`: 20 comparison rows PASS on a private GPU
  display; `art/staging/service-review/results.json`, galleries and 400/1440 captures.
  This is functional/visual integration evidence, not FPS or GPU cost evidence.
- Final targeted browser suite: 3/3 PASS in 152.0s (`class-tools`: 43 checks;
  `home-services`: 38 checks; `home-heroes`: actors/selection/details, actual delves,
  portraits/watch and offline reconciliation). TypeScript, format and lint PASS.

The fourteen alternate-look town walk paintings remain optional: the existing
`townWalkIds` fallback preserves each resident's selected look using its idle pose.
Equipment paper-doll layering, further worker routines, whole-landscape relief,
audio listening, exhaustive audits and fun acceptance are separate outstanding work.

## Pending art work — 2026-10-16 (generation blocked)

**Blocker: Codex is out of quota for the week (owner, 2026-10-16).** Every new
painting in this project is a Codex/imagegen run; none can start until the quota
resets. Record only — do not open a generation batch, and do not treat a saved
candidate as integrated.

Audit of this checkout (`art/pack.py`'s own rule over `art/manifest.json`, plus
the generated registries): **0** missing manifest masters, 72/72 class-skill
exports (`missing`/`invalid` empty; 4213764 bytes; 216 source/prompt/export
hashes pinned), 10 equipment layers. So the pending list is refinement, version
selection and layout — no placeholder or absent file is outstanding. (`art-qc`:
525 frames/0 failures is CUT236's recorded run, not re-measured here.)

| Pending | What is missing | Evidence to read first |
|---|---|---|
| Gunner ability V2 selection | `art/generated/skill_gunner_chamber_chain_v2.png`, `skill_gunner_long_watch_v2.png` + exact prompts are saved but unselected. Engineering review: both are far brighter at 24/32px than V1; chamber chain's brass cylinder may read as a gear/ring rather than a reload. Adopting needs `art/export_advanced_skills.py --library` and the 72-icon matrix — no generation. | `docs/evidence/cut254/gunner-v2/observations-2026-10-16.md`, `saved-candidates.json`, `preview-states.png` |
| Skill polish (remaining classes) | Rogue Veiled route; Caster Storm cell, Conduct, Last wall (muted); Gunner Rangefinder/smoke walk/cycling breach/breach route; repeated Engineer compositions; Fighter Rally/Oathguard/Execution arc repeated gauntlet close-ups and busy Siege rhythm; Ranger Split mark/Moving line excess scenery. | `docs/evidence/cut254/independent-review/observations-2026-10-16.md`, `art/ADVANCED_SKILLS.md` |
| Dungeon weapon identity (R4) | **Paintings closed 2026-10-18 (Cut267):** `hero_ranger_<look>_sword`, `hero_caster_<look>_{dagger,bow}`, `hero_gunner_<look>_short_gun`, `hero_{fighter,rogue}_<look>_crownsplitter` (18) are packed. **Selector fixed 2026-10-20 (Cut294):** actual Snapshot.hero.weapon selects all18 existing variants;56 earned production GL/Canvas captures and341 fallback/seek/context checks pass. Full Watch DOM/player recognition remains open; phone Canvas detail is small. R4 is not closed. | `docs/CUT267_ART.md` §4, HANDOFF §Cut246 |
| Paper doll mounts | **Resolved by owner decision 2026-10-18 ("More abstract", Cut271):** the Hub shows an equipment diagram (framed slot icon tiles around a plain silhouette, leader lines); per-piece mounts are off the runtime path. Masters, bases and registries kept. | `docs/evidence/cut271/paperdoll/`, `art/EQUIPMENT.md` |
| Town walk alternates | **Closed 2026-10-18 (Cut267):** all 14 `walk_<class>_<look>` are packed; `townWalkIds()` already requests them first. | `docs/CUT267_ART.md` §5 |
| Landmark layout (R6) | Canvas Crypt centrepiece is partly clipped at its upper viewport edge in the real nearby-gas view — layout, not new painting. | HANDOFF §R6, `docs/evidence/cut245/` |

**Update 2026-10-18 (Cut267):** Codex quota is back. The R4 paintings and the 14 walk alternates are delivered (rows above).
New art outside this table: the boss chest frames and effects, four clone-vat state frames (Cut264 §5) and achievement
badges. See `docs/CUT267_ART.md`.

Revalidate every row after a painting, export, display-size, frame or context
change; these are dated engineering observations, not owner or recognition
acceptance.
