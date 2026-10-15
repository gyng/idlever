# Cut242 — six distinct biome props, final review

The Fens stump/fish trap, Crypt sarcophagus/coffin and Foundry anvil/coal bin
now replace generic barrel/crate art in the existing canonical slots. All six
original versioned imagegen masters are preserved in `art/generated/` and their
superseded canonical masters remain unchanged. Generation prompts/results are
`art/prompts/cut242-biome-props.json` and
`art/staging/cut242/generation-results.json`; staging originals remain local.

The pipeline repair is opt-in: selected manifest `source` chooses the exact new
master; `margin:1` leaves an outer transparent pixel beyond the ink contour;
`refine_source:painted` retains the new structure instead of overwriting it with
round26 barrel/crate geometry. Shared class percentiles still use unchanged
round26 inputs. The complete temporary and production make_env/pack/QC runs
are recorded under `pipeline/`. Final proof:

- Six16×16 nonempty silhouettes, binary alpha, zero nontransparent edge pixels,
  zero mask changes during refinement,13/18 opaque colors (ceiling24).
-368 other tile PNGs byte-identical; all525 atlas frame rectangles unchanged;
  zero pixel changes outside the six selected atlas frames.
- Meaningful source alpha>16 touches zero edges; faint alpha1–2 generation
  noise is preserved in untouched masters. No source editing or invented glow.
- Art QC checks525 frames with zero warnings/failures; original/new master
  hashes unchanged. `pipeline/verify_integrated.py` reproduces numeric checks
  against pinned pre-integration Git blobs, without temporary-file dependence.

Actual quad recording exposed an unused Fens crate slot: the old corner branch
never selected it. Only its existing `0.42≤k<0.62` choice changed from reeds to
crate. All hashes, thresholds, placement/density/dimensions/fallback remain;
wet-edge/open-floor reeds remain. No Rust, gameplay, collision, navigation or
knowledge changed. Root reviewed and accepted both pipeline and scoped selector.

`replay-after/capture.json` records24 final GL/Canvas400/1440 frames from the
same genuine saved departure capsule131. Test-only wrappers record actual
selected atlas UV quads and the actual render camera bounds; they insert no
props or state. `natural-placement-summary.json` proves all six subjects fully
inside natural GL views at both widths. `natural-prop-crops.png` and its JSON
show unedited before/after screenshot crops, enlarged4× nearest, with exact
source frames/rectangles/world quads. Individual full frames and GL/Canvas
contact sheets were inspected: subjects distinguish themselves, characters,
gas and combat telegraphs remain readable. Fire/actor occlusion in one view is
not hidden: the anvil/coffin comparison uses another actual natural placement.

The existing Canvas renderer omits cosmetic dungeon dressing. Its12 matched
final views verify the existing usable fallback/state, **not** six new Canvas
decorations. `fallback-review/` intentionally returns404 for the entire atlas:
six real replay GL/Canvas phone views remain nonblank/usable with zero page
errors. `client-ctxloss-final.out` passes19 checks including blocked/lost GL,
Canvas continuation and restored GL on final selector source. This review
contains no performance claim.

`replay-identity.json` proves exact parent-save equality, byte-identical returned
replay JSON before/after art, and unchanged87de WASM. This is a current-runtime
reconstruction of a real saved capsule:30,689 ticks versus historical33,697.
That original historical mismatch is retained; no historical bit-identity or
causal package superiority is claimed. Input remains the tracked earned menu
fixture, with its existing provenance; no new sends, choices, grants or offline
progress were performed. The browser loads returned floors only.

Final build (including TypeScript), format and lint pass; final context-loss
group19 passes in52.7s on Node22.18.0. Build emits its existing bundle/dynamic
import notices. Art checks and replay checks are additional to root's preceding
41-group routine pass and five targeted-group pass; they do not turn those
earlier runs into a final-source full-suite rerun. No core/WASM change occurred.

## Reproduction and retained scope

From repository root, after dependencies/build setup:

```sh
python3 art/make_env.py
python3 art/pack.py
python3 art/art-qc.py
python3 docs/evidence/cut242/pipeline/verify_integrated.py
node docs/evidence/cut242/replay-identity.mjs
node docs/evidence/cut242/replay-after.mjs
node docs/evidence/cut242/replay-after.mjs --primitive
python3 docs/evidence/cut242/prop-crops.py
```

GPU capture uses only `tools/browser.mjs` private display and a fresh owned
Vite server, closed afterward. `run131.replay.json.gz` is the original exact
read-only return; `run131-summary.json` pins its source, hash and historical
limit. No new gameplay is required to reproduce the renderer review.

`CURATION.json` inventories every retained local artifact, hash, size and
whether it is in this commit. Committed visuals include all six natural crops,
matched phone/desktop GL milestones covering all six, representative Canvas
before/after views, and all six missing-atlas diagnostics. The full24 final
raws, contact sheets, and initial24 five-of-six pre-selector views remain local;
redundant files are explicitly outside the commit. Re-run capture before
regenerating full contact sheets on a checkout containing curated milestones.
Staging masters/preview tiles are also preserved locally and duplicate the
committed versioned masters/candidate proof. Nothing was deleted to hide an
unsuccessful/unused placement.

This cosmetic delivery does not complete R3 encounter counter causality, R4
earned loadout comparisons, R6 semantic dungeon landmarks, biome variety,
full exhaustive acceptance or the independent fun rating. No push/deploy.
