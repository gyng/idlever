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
Some raw-image previews expose coloured RGB stored under zero alpha; inspect
the alpha channel or the actual composed Hub before diagnosing a background
halo. Do not regenerate or colour-key a valid transparent master based only on
that preview appearance.

Generated wearables vary in scale and position despite registration prompts.
`web/src/ui/hero-equipment-figure.ts` therefore mounts each with an explicit
uniform scale and translation. Inspect their fit on all three looks at actual
Hub size: each piece reads at its intended slot, the face remains visible,
and no second baked weapon appears. Owner refinement2026-10-16 explicitly
permits a more abstract paper doll to simplify implementation. Stylized
placement is sufficient; anatomically precise grips, tailored garment fit and
additional identity-specific armour variants are not required. Keep the
existing painted assets, while treating the composition as an equipment diagram.
Null slots paint no equipment. Missing/failed images retain primitive fallbacks.
The UI reads equipment kinds and Actual/Next from Rust; the art registry must
never decide eligibility, ownership, effects, spending or phase boundaries.

Current status: masters/export and scoped painted Hub acceptance are complete.
`docs/evidence/cut220/painted-8879/` retains the new source-specific layout,
paint-adoption, ownership, fallback and preference proofs. Prior primitive
proofs remain historical. Expanded class trees, dungeon weapon artwork and
broader R7 acceptance remain separate open work.
