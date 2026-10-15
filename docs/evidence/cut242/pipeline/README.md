# Cut242 pipeline preparation and integration proof

Six selected versioned masters now live in `art/generated/` with their original
staging bytes preserved. Existing `envp_<biome>_{barrel,crate}.png` masters are
untouched. `before.json` pins both sets and all pre-integration tile/atlas hashes.
Root inspected and accepted `candidate-review.png`: conservative original
biome palette/value normalization, distinct six silhouettes, no calibration or
minimum-color-count change. Runtime review is still pending.

The actual pipeline bug was unconditional `refine_all()` repainting every
converted tile from `tiles_r26`, restoring generic barrel/crate geometry.
Six existing canonical painted manifest entries now opt in with:

- `source`: exact versioned master path relative to `art/`, under `generated/`.
- `refine_source: "painted"`: refinement reads that tile's converted structure.
- `margin: 1`: one fully transparent outer pixel beyond the ink rim; legacy
  assets retain their exact original fit when this field is absent.

Group percentile normalization still reads only the unchanged round26 register.
This preserves other props' palette and value bands. No renderer IDs, frame
rectangles, spawning, walkability, navigation, engine or gameplay changed.
QC resolves the selected source for missing-file, freshness and source-size
checks, and recognizes its versioned generated filename without weakening
unregistered-file checks for other files.

The complete temporary pipeline ran in `/tmp/idlever-cut242-candidate`:

```sh
python3 /tmp/idlever-cut242-candidate/art/make_env.py
python3 /tmp/idlever-cut242-candidate/art/pack.py
python3 /tmp/idlever-cut242-candidate/art/art-qc.py
python3 docs/evidence/cut242/pipeline/verify_candidate.py /tmp/idlever-cut242-candidate
```

To reproduce the temporary root, copy `art/*.py`, `manifest.json`, `tiles/` and
`tiles_r26/` into its `art/` directory and point its `art/generated` symlink at
the current source masters (read-only use). `pack.py` creates its own
`web/public/art/`; production paths are never its output. Preserve the original
`before.json` when rerunning this pre-integration verification. Commands above
are preparation instructions, not authorization to modify the production atlas
while the current client suite holds it.

Results in `candidate-tile-qc.json`, with complete stdout/stderr logs:

- Exactly6 selected tile PNGs change;368 other tile PNGs are byte-identical.
- All525 atlas frame rectangles are identical. Zero pixel changes outside
  the six selected frames; their packed pixels exactly equal candidate tiles.
- Six16×16 nonempty masks, binary alpha, zero nontransparent outer-edge pixels;
  refinement preserves every converted alpha bit (zero mask XOR).
- Source silhouette alpha>16 touches zero image-edge pixels. Source-edge alpha
  maxima1–2 are faint generation noise, preserved in untouched masters; it is
  not rendered as a glow or treated as a cut-off silhouette.
- Opaque colors18/13/13/13/18/13 (Fens barrel/crate, Crypt barrel/crate,
  Foundry barrel/crate), all≤24. Color count is a ceiling, not a target.
- Art QC:525 frames, zero warnings, zero failures. Python syntax passes.
- Original and selected master SHA256 remain unchanged; production atlas hashes
  still equal `before.json`. No production tile/atlas integration is claimed.

`candidate-review.png` shows old/new8× silhouettes and native tile composition
on unchanged biome floors. Fish-trap weave is reduced at the12px content width,
but its mouth/taper survive; a real-replay review must assess final readability.
This is not a claim that six small props complete semantic dungeon landmarks,
encounter counter causality, biome variety or fun acceptance. Required next:
root releases the current41-group suite hold, then integrate only the six
verified tiles/atlas and review actual400/1440 GL/Canvas replay frames with
unchanged saves/state, followed by final pack/QC evidence. No push or staging
has occurred in this preparation.

Final integration followed root's41-group terminal pass and hold release.
`integrated-*.out` and `integrated-proof.json` record the complete production
pipeline, identical reviewed tiles,368 unchanged other PNGs and zero atlas
changes outside six rectangles. Root then authorized the single cosmetic Fens
selector amendment after actual capture proved its crate slot unused. Final
six-of-six replay, fallback and client checks are in the parent README; the
earlier preparation/hold statements above remain the historical phase record.
