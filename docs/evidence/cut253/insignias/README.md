# Advanced insignia artwork draft

2026-10-16, root engineering art review. These30SVG compositions correspond to
the30interactions in Cut225/Cut253. They use the existing BONE/INK/MIST native
icon system; no image generation or bitmap replacement is involved.

`web/src/ui/advanced-skill-marks.ts` exports the draft path data. It is deliberately
not imported by the live icon registry: the72node native catalogue/mechanics
are not implemented yet. Existing42registered icons and their behavior remain
unchanged. This is artwork preparation, not new gameplay, an earned class tree,
native integration, accessibility acceptance or player recognition evidence.

`fourth/` passes30unique compositions,270size/state cells (24/32/48px ×locked/
available/learned), exact dimensions, nonempty SVG paths, no horizontal overflow,
complete1440×900board and0page errors. Root inspected both actual dark and paper
screenshots. Labels and individual motifs remain readable at displayed sizes;
no independent player recognition or numeric contrast measurement is claimed.
The eventual registered component still needs its own canonical labels, fallback
and accessible-name checks alongside real native node delivery.

Earlier attempts remain honest:

- `first/`: local server never became ready; no browser/art review. Original
  stderr was discarded, so its exact cause is unverified. Subsequent attempts
  use the approved browser environment and retain Vite logs.
- `second/`: preview fetched Vite's CSS endpoint as text instead of importing
  its stylesheet module. Exact-size assertion failed. Original script and error
  retained; no product or artwork failure was inferred.
- `third/`: all geometry assertions pass. Root rejected paper-context labels:
  the preview theme was applied to the ancestor while body retained its dark
  text colour. Original screenshots/script/review remain. Fourth applies the
  theme to body; the SVG data itself is unchanged.

Reproduce from repo root with Node22 and the repository's headless launcher:

```
TMPDIR="$PWD/scratchpad/cut244-browser-tmp" node docs/evidence/cut253/insignias/preview.mjs NEW_DIRECTORY
```

Use a new output path. This is one desktop contact sheet, not an added phone
testing preset. Raw results, source hashes, script identity and exact PNGs are
retained. Scoped Oxfmt/Oxlint pass. Revalidate after path data, CSS, live registry,
native node IDs, state semantics or displayed icon sizes change.
