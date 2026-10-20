# Cut294 — actual weapon paintings in Watch

ReplayState now reads Snapshot.hero.weapon and requests Cut267's existing six
supported class/weapon variants, across male/female/cat looks. GL and Canvas
share weapon→class/look→class fallback. No weapon or unsupported combinations
retain old behavior; all-art failure still draws primitives. No art pixels,
WASM/game rules or saved state changed. ViewerStats exposes selected heroKind.

The focused test also caught existing Atlas.load failure at
`atlas full (ent:town_storehouse_1)`: dungeon loading packed117 town-only frames
into its512×512 entity sheet. Town has a separate loader. Excluding town-only
frames allows the full dungeon load and final alias/water setup to complete.
No sheet enlargement, art deletion or failed-load assertion bypass.

Evidence stages, all retained with exact input/source/PNG hashes:

- before/:12 captures, six affected original weapon/class pairs ×phone GL/Canvas;
  all12 show the wrong selected kind.
- after-selector/:56 correctly selected frames before the atlas defect was fixed;
  historical/superseded. Initial failed controls identify the atlas overflow.
- after/:final56 frames,14 actual earned Cut293 moments ×phone402×681 and
  desktop1440×900 ×GL/Canvas. All selected kinds match; GL drawn hero rectangles
  match and overlap viewport,0 page errors. Actual driver D3D12/NVIDIA RTX3080 on
  launchGpu's private Xvfb. Standalone production viewers, not full Watch DOM.

All captured floors/events are unchanged native replay data, first landed attack
whose target survives through event.t+2; authored Fighter prefers cleave and
Caster bolt. These are existing earned runs, not additional simulations. Every
moment is independently checked against the364-receipt Cut293 native archive.
No enemy/weapon/snapshot mutation is used for the earned images.

`web/tests/watch-weapons.mjs` passes341 checks across all18 frames, controlled
missing-variant and no-art fixtures, legacy/unsupported behavior, seek/reset,
plus headless production GL context loss/restoration. Fixtures explicitly differ
from earned scenes. Existing combat-identity54 and hero-slot-looks54 checks pass.
Types/lint/format/copy/web build pass. Build reports existing chunk/dynamic-import
warnings. No Rust/WASM/balance or broad client audit run is implied.

Run `python3 docs/evidence/cut294/verify.py` from repo root (Python3,Pillow,zstd).
It verifies native source receipts, exact selected floors/events/hashes, all124
stage PNGs/matrices and control/log receipts. The first verifier invocation hit
a Python select.py import shadow; renamed moment_selection.py and reran. Selected
moment bytes stayed exact; failure log retained. Original viewport frames remain
primary; hero-comparison-crops.png is labelled2×nearest diagnostic crops, and
packed-art-inventory.png is an inspection aid from unchanged packed source art.

See observations.md: visual selection is clear, but shared red capes, torch glare
and overlap obscure detail; Canvas map-scale phone weapons are harder to identify
than GL fight framing. Agent visual judgment, automated measurement and missing
owner/player feedback are separate. This does not certify player recognition,
unique class identity, build superiority, full R4/fun or full Watch UI acceptance.

Next: actual Watch DOM/replay flow revalidation. Held W2/recovery/Guide gap4,
inherited balance failures, broader R3/R4 and independent fun remain open.
No release or deployment. All validation/capture jobs are terminal.
