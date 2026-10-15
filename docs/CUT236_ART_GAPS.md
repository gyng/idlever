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
