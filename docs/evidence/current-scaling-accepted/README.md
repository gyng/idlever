# Current UI scaling check

Fresh no-HMR server 5254 imported the current styles and real WASM directly. No style injection was used. The private GPU browser closed with exit 0 after 24 settled captures: Home, Forge, Bloodline Loadouts and the current Quest card, at 320/400/1440px and normal/exact doubled root text size. This is correctness evidence, not a performance measurement.

## Results

- All 24 documents have zero horizontal overflow. All measured menu containers have zero horizontal overflow.
- All six Home captures have zero console overflow and zero caption/other-stat intersections. Gold measures 44px high in each; Settings and footer controls also meet 44px targets without reveal scaling.
- 462 actual button bounds were checked. One old Home label failure remains in this snapshot: 320px/200% Kennel info ends at 322.667px, with 3px town overflow. Preserve this failure. Root subsequently added label-size observation and stable max-content sizing, and owns the fresh authoritative label/badge/scene-bound proof. This folder does not certify that later source.
- The Forge price remains whole at 320px/200%; narrow menus wrap actions and reserve 44px close controls without consuming doubled frame padding.

`summary.json` records the two related failed bounds assertions; no gate was relaxed. `bounds.json` contains raw measurements. Label-pair/badge intersections were not asserted in this harness. Root's focused label suite supplies that separate acceptance.

## Provenance

`served-modules.json` hashes and archives actual browser module responses, including town.ts SHA-256 `76090744bca45b19c360c98071cbc84dc0d32403afa1827c3a510f1c67830ed8`, town.css `5fd0d4dd570cf44467df78703dd0c9c3e3fc3a5365f4eaca1ee5ced1362571b9`, and cut29.css `968a17e077dc5ee629636a69d4d1ba2c26867c9447eccffe7c4f1d6826bd1e8e`. These transformed responses differ from raw file hashes. `source-sha256.json` records files at final aggregation; root was concurrently refining label sizing.

The unchanged real engine package is 6,416,437 bytes, SHA-256 `00abb85939603828991c8d4f2c148a8b5be84105c8e5791fa3e75fbf2403b292`. `inputs.json` records the genuine earned Quest save. The first failures and earlier Gold-height phase remain separately in `../current-scaling/` and `../current-scaling-final/`; their PNGs were not overwritten.

## Scope left open

This check covers current Home chrome and three menu surfaces. It does not certify every menu, all Class/Legacy child states, universal text scaling, keyboard accessibility or the full client audit. Some compact Home chrome still uses fixed font sizes; broader desktop type-role refinement remains queued. Building help typography now follows rem sizing; final label placement belongs to the root's subsequent current-source check.

Transformed module bodies in each phase are byte-preserved in `served-module-bodies.tar.gz` with SHA-256 readback in `archive-manifest.json`. Extract into the same directory to restore the filenames named in `served-modules.json`. The standalone capture driver remains `check.mjs.txt`.
