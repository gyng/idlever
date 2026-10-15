# Hero equipment figure artwork

This library is for the large Hero Hub equipment figure. Dungeon combat sprites
remain a separate renderer/art task. The neutral figures have empty hands and
plain clothing so the Hub can show the actual canonical four equipment slots.
Male, female and cat select only the visible identity; they imply no game rules.

The selected masters are `generated/hero_equipment_base_male_v2.png`,
`generated/hero_equipment_base_female_v1.png` and
`generated/hero_equipment_base_cat_v1.png`. Seven additional masters cover
Crownsplitter, Hearthglass armour, Frostmantle, Ironcap, Hearthglass hood,
Trailboots and Hearthglass boots. Existing twelve ordinary weapon/body icons
retain their original source library. Exact generation prompts are in
`prompts/hero_equipment_*.txt`; provenance and initial review are retained in
`../docs/evidence/cut220/`.

All new masters came from the built-in imagegen tool and remain untouched.
Run `python3 art/export_equipment.py` to export the ten selected layers to
`web/public/ui/equipment/` and regenerate `art/equipment.json`. Export preserves
the entire 1024×1536 registration canvas, downsamples to384×576 with Lanczos,
and writes lossless WebP with alpha and hidden RGB preserved. There is no
automatic crop, background removal, colour key or semantic image alteration.
The manifest records source/output SHA256, bytes and visible alpha bounds.
Repeated export is byte-exact with the current Pillow/WebP environment.

Generated wearables vary in scale and position despite registration prompts.
`web/src/ui/hero-equipment-figure.ts` therefore mounts each with an explicit
uniform scale and translation. Inspect their fit on all three looks at actual
Hub size: grip meets hand, boots cover toes, helm leaves the face visible, body
gear covers the shirt without floating, and no second baked weapon appears.
Null slots paint no equipment. Missing/failed images retain primitive fallbacks.
The UI reads equipment kinds and Actual/Next from Rust; the art registry must
never decide eligibility, ownership, effects, spending or phase boundaries.

Current status: masters/export complete; final mounting and UI acceptance are
in progress. Prior primitive-figure proofs do not certify these painted layers.
