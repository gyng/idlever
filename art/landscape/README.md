# Cut132 home landscape

`home-landscape-v1.png` is the unmodified authored source sheet, generated with
OpenAI's built-in imagegen tool, with transparent background. Style reference:
`art/generated/town_mouth_cave.png` (existing approved cave painting).

Prompt: create four separate natural landscape cutouts in the reference's
moonlit ink-and-wash painted pixel style, arranged as a two-by-two sheet: a wide
low mossy slate rock bank with ferns; an irregular compact boulder cluster with
gravel and moss; low dark fern/bramble undergrowth with a weathered fallen log;
a staggered group of three mature blue-green pines with boulders at the base.
Keep quiet DUSK/MOON slate and dark Town moss, pigment pooling and coarse pixel
edges, no bright highlights, cave entrance, torches, buildings, characters,
paths, sky, UI or text. Transparent background.

`python3 art/home_terrain.py` reproduces runtime assets in
`web/public/art/landscape`: connected alpha-island crop/BOX packing for props,
and the existing `painted.convert` + `town_tiles.ground` painterly material
pipeline at128×128 instead of16×16, using original envp_town paintings.
Original source paintings and global atlas are untouched.
