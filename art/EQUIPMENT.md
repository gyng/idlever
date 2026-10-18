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

Owner decision2026-10-18 ("More abstract", Cut271) replaced the painted mounted
figure. `web/src/ui/hero-equipment-figure.ts` now draws an equipment diagram: a
plain code-drawn neutral silhouette (look only changes its outline: hair, cat ears
and tail) with four framed slot tiles around it, each joined to its body region by
a leader line. Weapon/body kinds with an item icon show `ui/icons/it_<kind>.png`;
the seven painted wearables show their own visible area, a square view box around
the alpha bounds recorded here, inside the tile. There are no per-piece mount
transforms and no painted base on the runtime path. The neutral bases and every
master/export remain in place (the registry's `mounting` note is historical), so a
painted figure can return without regeneration. Slots that wear different gear in
Next delve than Actual are highlighted; tiles carry the gear's name (≤3 words) and
a detail tooltip. Evidence: `docs/evidence/cut271/paperdoll/`.
Null slots show a quiet dashed "empty" tile. Missing/failed images retain primitive fallbacks.
The UI reads equipment kinds and Actual/Next from Rust; the art registry must
never decide eligibility, ownership, effects, spending or phase boundaries.

Current status: masters/export and scoped painted Hub acceptance are complete.
`docs/evidence/cut220/painted-8879/` retains the new source-specific layout,
paint-adoption, ownership, fallback and preference proofs. Prior primitive
proofs remain historical. Expanded class trees, dungeon weapon artwork and
broader R7 acceptance remain separate open work.
