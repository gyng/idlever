# Cut242 — six distinctive biome props

Approved direction source: art/ART.md register3b, docs/ART_DIRECTION.md.
The current atlas has all required files, but the Fens/Crypt/Foundry barrel and
crate slots still show generic barrels and closed boxes. Exact current mappings
and atlas crops are in evidence/handoff-content/packed-prop-mapping.json and
packed-prop-crops.png. This is a thematic-art gap, not a missing-loader claim.

Generate six versioned transparent raster masters using built-in imagegen:
Fens stump/fish trap; Crypt sarcophagus/coffin; Foundry anvil/coal bin. Preserve
original generated masters. Reuse canonical biome/slot renderer keys and
primitive fallbacks; no Rust, simulation, spawning, navigation or collision
changes. New paintings remain visual decorations, not tactical landmarks.
Do not alter the atlas until current integration captures finish. Prompt set:
art/prompts/cut242-biome-props.json.

Acceptance:6/6 masters inspected;6/6 converted16x16 tiles keep distinct
approved subject silhouettes at native and8x scale; binary transparent alpha,
no nontransparent image-edge clipping, nonempty silhouettes, palette<=24
colors using existing painted pipeline. Compare before/after over real biome
floors and in actual read-only replay views at400/1440 GL/Canvas, preserving
exact saves and replay state. All manifest sources exist, pack/QC0failures;
primitive/missing-art fallback remains usable. Retain source/prompt/result
hashes and superseded images. This cut does not complete encounter counter
causality, semantic dungeon landmarks, broader biome variety or fun acceptance.

Observed integration amendment: actual GL quad diagnostics found the Fens
crate slot was never selected by existing `dress()`, so the new fish trap could
not appear naturally. Replace only the existing Fens corner `0.42≤k<0.62`
choice from `reeds` to canonical `crate`. Preserve all hashes, thresholds,
placement conditions, dressing density, dimensions and fallback. Wet-edge and
open-floor reed branches remain unchanged. This is a cosmetic selector change;
it adds no Rust, collision, navigation, facts or Canvas dressing. Repeat actual
Fens400/1440 GL/Canvas replay review and save/replay identity on final source;
preserve the initial24 five-of-six views as pre-selector evidence.

Status: complete within this cosmetic scope. Six versioned masters inspected;
six native silhouettes reviewed;368 other tile PNGs byte-identical, zero atlas
pixel changes outside six unchanged frame rectangles. Full art QC passes525
frames with zero warnings/failures. Final24 matched replay views prove all six
natural GL subjects at400/1440; Canvas retains its existing omission of cosmetic
dressing and remains usable. Six explicit missing-atlas diagnostic views and
19 context-loss checks pass. Exact parent save, replay JSON and WASM unchanged;
build/TypeScript, format and lint pass. Evidence: `evidence/cut242/README.md`.
No broader R3/R6 acceptance or performance claim is made.
