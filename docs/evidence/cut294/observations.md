# Watch weapon review — 2026-10-20

Evidence type: automated production-viewer captures + agent visual review.
No owner/player feedback or blind fun rating collected. Source/build/PNG hashes,
exact native Cut293 save/replay/action identities and capture times are in the
stage results and identity.json. The14 selected floors/events are unmodified
native earned replay data; preferred cleave/bolt moments use actual fired events.

Geometry/input: primary phone402×681 and desktop1440×900 CSSpx, text scale1,
device scale1.5, reduced motion. Visible viewport screenshots of paused standalone
production GL/Canvas viewers, no full Watch DOM/chrome. Phone is browser-content
approximation, not Safari/device acceptance. launchGpu used private Xvfb;
actual driver ANGLE D3D12/NVIDIA RTX3080. No focus steal or frame-time claim.

Automated observations: before12/12 selected-variant mismatches (six supported
class/weapon pairs × GL/Canvas at phone). Selector-only after56/56 matched, then
superseded when focused controls found old full Atlas.load overflow at
ent:town_storehouse_1. Town has its own atlas loader. Skipping117 town-only frames
in dungeon loading fixes that failure; final exact56-moment pass matches all
selected kinds, GL drawn rectangles and both backend stats,0 page errors. Actual
full atlas loaded in341 controlled checks, including18 look/weapon variants,
legacy/seek, missing-variant/class-look and all-art-absent primitive behavior.
Headless production GL loss/restoration keeps the short-gun variant. Controlled
fixture mutations are separate from earned moments. Atlas JSON/PNG unchanged.

Agent visual review: inspected six before/after phone GL hero crops, packed art
inventory, final full phone GL Ranger sword/Caster bow/Fighter Crownsplitter,
phone Canvas Rogue Crownsplitter/Caster dagger/Gunner short gun, desktop GL
Caster dagger authored bolt, and desktop Canvas Fighter Crownsplitter authored
cleave. New silhouettes replace the old baked bow/staff/long-gun or ordinary
blade. Dagger is raised, Caster bow draws an outlined curve, axe has a broad split
head, pistol lacks the long barrel. Blue-white projectile streak in the authored
Caster desktop moment accompanies the actual bolt event. Selecting a dagger
painting does not mean a dagger attack occurred in that spell-only run.

Recognition limits: shared red capes, torch glare, attack flashes and nearby
actor overlap reduce weapon detail in these phone GL moments. Canvas is the
existing map-scale fallback rather than GL's closer fight framing; phone weapons
are smaller and pistol/dagger details are harder to distinguish there. Confidence
high in actual frame selection and changed silhouettes, medium in unaided
recognition of every weapon at phone scale. This is not proof of user comprehension,
unique class identity, superiority or completed R4 acceptance. The labelled2×
nearest-neighbour crops supplement original viewport frames; they are not normal
player scale or a full-page inventory. No pixels were recoloured or sharpened.

Revalidate after renderer/art, camera scale, look, weapon, event or player-context
changes. Existing after-selector images remain historical/superseded evidence.
