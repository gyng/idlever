#!/usr/bin/env python3
"""Cut267 (2026-10-18): compose the Codex/imagegen prompt batches for the boss chest, clone vat states,
achievement badges, R4 weapon-identity hero sprites and the town walk alternates.

Writes art/prompts/cut267_<batch>.txt. Each prompt: the approved STYLE preamble (docs/ART_DIRECTION.md, the same
text as art/prompts/town_clone_vat.txt), the batch's rules, then one numbered job per asset with its exact output path
under art/staging/cut267/<set>/. Run: python3 art/cut267_prompts.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
STAGE = ROOT / "staging" / "cut267"
PROMPTS = ROOT / "prompts"

_vat = (PROMPTS / "town_clone_vat.txt").read_text()
STYLE = _vat[_vat.index("=== STYLE"):_vat.index("=== SPRITE RULES")].strip()

TARGETS = ", ".join(str(ROOT / "ui/targets/style" / n) for n in ("watch_warrens.png", "boss.png", "hero_sheet.png"))


def head(what: str, out_dir: Path, refs: list[str]) -> str:
    return (
        f"You are painting {what} for the game \"Idlever\" (a gothic dark-fantasy roguelike on a phone).\n"
        f"FIRST look at these approved STYLE TARGETS (you may open these images and the reference images named below, nothing else): "
        f"{TARGETS}{', ' + ', '.join(refs) if refs else ''}.\n"
        "Use your built-in image_gen tool, one call per asset below (an edit of the named reference image where the job says EDIT). "
        "Do NOT write code beyond a PIL resample / alpha fix / crop; do NOT touch anything outside "
        f"{out_dir}/. Create that directory if needed. Do not leave _inspection_*.png or any other scratch file behind. OVERWRITE existing files.\n"
        "For each asset: generate it and save the final PNG (sRGB) to the exact path at the exact size. Self-check each output "
        "(background as the job states, subject not cropped, no text or letters); regenerate that asset once if it fails.\n\n"
        f"{STYLE}\n\n"
    )


def jobs_text(jobs: list[dict]) -> str:
    out = []
    for i, j in enumerate(jobs, 1):
        out.append(
            f"--- {i}. id: {j['id']}\nOutput path: {j['path']}\nSize: exactly {j['size']} px (width x height), PNG.\n"
            f"Background: {j['bg']}\n{('Reference to EDIT: ' + j['ref'] + chr(10)) if j.get('ref') else ''}"
            f"Shown in game at {j['shown']}; judge readability at that size.\nBrief: {j['brief']}\n"
        )
    return "\n".join(out)


TRANSPARENT = "a genuinely TRANSPARENT background (PNG alpha, all four corners alpha 0); if the tool returns an opaque image, ONE flat uniform pure MAGENTA #FF00FF edge to edge (the pipeline keys it) — never paper, floor or gradient."
BLACK = "ONE flat uniform pure BLACK #000000 edge to edge, opaque (the pipeline turns brightness into alpha: black = fully transparent, so everything you paint must be LIGHT on the black; nothing dark is visible)."

batches: dict[str, tuple[str, str, list[str], list[dict]]] = {}

# --- 1. boss chest -----------------------------------------------------------------------------------------------
d = STAGE / "boss_chest"
CHEST_BOX = ("SAME FRAMING in all three chest frames: the chest BODY (the box below the lid) is centred horizontally, about 600 px wide, its "
             "bottom edge at y = 880 px and the lid's hinge line at about y = 600 px; leave the upper ~45 % of the canvas EMPTY for the open "
             "lid and its light. ")
CHEST = ("A BOSS REWARD CHEST revealed in the dungeon after a boss kill, seen from the game's high three-quarter top-down camera (the lid "
         "top and the front face both visible, front facing the viewer and slightly lower-left). A heavy squat iron-bound chest of near-black "
         "UMBRA/DUSK oak planks, thick riveted iron straps with MIST moonlit rims on the top edges, worn GILT corner caps and a GILT hasp; "
         "the BOSS MARK: a small BLOOD-red crown-shaped seal/gem set in the lock plate (the only BLOOD). Chunky proportions, one bold "
         "readable mass, a thick closed INK contour, painted washes on a coarse visible pixel grid. NO floor, NO shadow pool, NO scenery, NO text. ")
batches["boss_chest"] = (
    "BOSS CHEST frames and chest-opening EFFECT sprites", str(d), [str(ROOT / "ui/icons/gold.png"), str(ROOT / "ui/icons/alert.png")],
    [
        {"id": "chest_boss_closed", "path": str(d / "chest_boss_closed.png"), "size": "1024x1024", "bg": TRANSPARENT,
         "shown": "about 40 px tall in the dungeon and 160 px tall in a full-screen reveal",
         "brief": CHEST + CHEST_BOX + "FRAME 1, CLOSED: the lid shut and latched, the crown seal intact, no light, a faint MIST rim only."},
        {"id": "chest_boss_cracked", "path": str(d / "chest_boss_cracked.png"), "size": "1024x1024", "bg": TRANSPARENT,
         "ref": str(d / "chest_boss_closed.png"),
         "shown": "about 40 px tall in the dungeon and 160 px tall in a full-screen reveal",
         "brief": "EDIT chest_boss_closed.png (generate it first, then edit it): the SAME chest, body identical in shape, size and position. FRAME 2, "
                  "LID CRACKING: the hasp burst open, the lid lifted a few finger-widths on its hinge, and a bright warm-white BONE and pale GILT light "
                  "LEAKS from the glowing seam as a handful of short hard-edged light blades fanning upward (stepped pixel shards, not a blur), the "
                  "crown seal glowing. The light stays close to the chest (within ~200 px of the seam). " + CHEST_BOX},
        {"id": "chest_boss_open", "path": str(d / "chest_boss_open.png"), "size": "1024x1024", "bg": TRANSPARENT,
         "ref": str(d / "chest_boss_closed.png"),
         "shown": "about 40 px tall in the dungeon and 160 px tall in a full-screen reveal",
         "brief": "EDIT chest_boss_closed.png: the SAME chest, body identical in shape, size and position. FRAME 3, OPEN: the lid thrown fully back "
                  "on its hinge (standing up behind the body, its INK-lined underside visible), the inside heaped with GILT gold coins and a few "
                  "BONE gleams, a column of warm BONE/pale-GILT light rising from the open mouth in stepped pixel shafts and fading upward inside "
                  "the canvas (no blur haze beyond the shafts). " + CHEST_BOX},
        {"id": "chest_fx_rays", "path": str(d / "chest_fx_rays.png"), "size": "1024x1024", "bg": BLACK,
         "shown": "160-320 px wide behind the chest, rotating slowly, additive",
         "brief": "A LIGHT-BURST / god-ray SUNBURST effect only (no chest, no object): 12 to 16 tapered light RAYS radiating from the exact canvas "
                  "centre, alternating long and short, each ray a crisp stepped-pixel wedge filled with a pale BONE-to-MIST wash with a little "
                  "granulation, brightest (near white) at the centre and fading to black before the canvas edge (nothing touches the edges); a "
                  "small bright round core at the centre. Neutral pale colour (it is tinted in code). Radially symmetric so it can rotate."},
        {"id": "chest_fx_sparks", "path": str(d / "chest_fx_sparks.png"), "size": "1024x512", "bg": TRANSPARENT,
         "shown": "each cell about 12-24 px, burst out of the chest as particles",
         "brief": "A PARTICLE SPRITE SHEET: a 4 x 2 grid of 256x256 cells, ONE small object centred in each cell, nothing crossing a cell "
                  "border, the same scale in every cell. TOP ROW: one GILT gold COIN spinning, four frames: (1) face-on round coin with a "
                  "stamped crown, (2) turned three-quarter (an oval), (3) edge-on (a thin bar), (4) three-quarter the other way; each coin "
                  "with a thick INK contour, BONE glint top-left, chunky stepped pixels (match the gold icon reference). BOTTOM ROW: four "
                  "SPARKLE frames, a hard-edged four-pointed pixel STAR glint growing then shrinking: (5) a small dot cross, (6) a medium "
                  "four-point star, (7) a large four-point star with short diagonal secondary points, (8) a medium star fading; sparkles in "
                  "BONE white with a pale GILT core, thin INK edge so they read on a light background."},
        {"id": "chest_fx_ring", "path": str(d / "chest_fx_ring.png"), "size": "1024x1024", "bg": BLACK,
         "shown": "160-320 px wide under/behind the chest, scaled up as a shockwave, tinted by item rarity in code",
         "brief": "A GLOW RING effect only: one clean circular luminous RING centred on the canvas, outer diameter about 820 px, ring band about "
                  "70 px thick, the band's centre line near white and falling off softly on both sides, a few small stepped pixel motes along it "
                  "and a faint inner glow; pale neutral BONE/MIST white (it is tinted to the item's rarity colour in code). A perfect circle "
                  "(viewed face on), nothing outside the ring touches the canvas edges."},
    ],
)

# --- 2. clone vat states -----------------------------------------------------------------------------------------
d = STAGE / "clone_vat"
IDLE = str(ROOT / "generated/town_service_device.png")
ACTIVE = str(ROOT / "generated/town_service_device_active_0.png")
KEEP = ("EDIT the reference image. Preserve the EXACT canvas size (1536x1024), object footprint, outer silhouette and every exterior part "
        "in the same pixel position: domed riveted cap, iron bands, glass columns, octagonal stone platform, hoses, small boxes, grates and the "
        "valve wheel; transparent background. Change ONLY what is inside the glass cylinder as stated. No exterior glow, no ground, no new props, "
        "no text. ")
batches["clone_vat"] = (
    "CLONE VAT state frames (town service sprite)", str(d), [IDLE, ACTIVE, str(ROOT / "generated/town_service_device_active_1.png")],
    [
        {"id": "town_service_device_grow_0", "path": str(d / "town_service_device_grow_0.png"), "size": "1536x1024", "bg": TRANSPARENT,
         "ref": IDLE, "shown": "about 36 px tall in the town",
         "brief": KEEP + "GROWTH STAGE 1 of 3 (just started): the fluid a dim cold MOON/DUSK teal lit faintly from below by MIST, a SMALL pale BONE "
                  "curled seed-like form (a fist-sized curled shape, no anatomy, nothing gory) floating low in the tank, two thin pale tubes "
                  "from the cap reaching it, a few tiny bubbles."},
        {"id": "town_service_device_grow_1", "path": str(d / "town_service_device_grow_1.png"), "size": "1536x1024", "bg": TRANSPARENT,
         "ref": IDLE, "shown": "about 36 px tall in the town",
         "brief": KEEP + "GROWTH STAGE 2 of 3 (half grown): the fluid brighter MIST-lit, a pale BONE curled human silhouette about HALF the "
                  "tank's height floating mid-tank (knees drawn up, no face detail, no anatomy, nothing gory), one thin BLOOD-red vein of light "
                  "beside it (a sliver), several rising bubbles."},
        {"id": "town_service_device_grow_2", "path": str(d / "town_service_device_grow_2.png"), "size": "1536x1024", "bg": TRANSPARENT,
         "ref": IDLE, "shown": "about 36 px tall in the town",
         "brief": KEEP + "GROWTH STAGE 3 of 3 (nearly done): the fluid bright cold MIST glow, a full-height pale BONE upright human silhouette "
                  "filling the tank (arms at the sides, head slightly bowed, no face detail, no anatomy), the thin BLOOD vein of light running up "
                  "its centre, many bubbles; this should read like the existing active frames but a touch brighter."},
        {"id": "town_service_device_ready", "path": str(d / "town_service_device_ready.png"), "size": "1536x1024", "bg": TRANSPARENT,
         "ref": IDLE, "shown": "about 36 px tall in the town",
         "brief": KEEP + "READY / DRAINED: the tank is EMPTY of fluid and EMPTY of any figure (the clone has stepped out). The glass is drained "
                  "and clear: you see the dark UMBRA interior and the back of the tank through it, wet streaks and a few droplets running down "
                  "the inside, a thin shallow puddle line of pale MIST fluid at the very bottom. The FRONT GLASS PANEL is a curved HATCH swung "
                  "OPEN (hinged on its left edge, turned toward the viewer so it stays INSIDE the existing outline of the cap and platform, never "
                  "beyond the outer silhouette), a dark open gap where it was. A faint MIST light on the wet glass; no BLOOD."},
    ],
)

# --- 3. achievement badges ---------------------------------------------------------------------------------------
d = STAGE / "badges"
ALERT = str(ROOT / "ui/icons/alert.png")
GOLD = str(ROOT / "ui/icons/gold.png")
MEDAL = ("An ACHIEVEMENT BADGE UI icon, 256x256, matching the reference UI icons (alert.png: a round carved medallion with a thick INK "
         "outline, chunky stepped pixel clusters with a painted wash inside, cold MIST moonlight on the top edge). ONE round medallion, "
         "viewed face-on, centred, outer diameter about 220 px (the SAME size and outline in every badge so they swap in place), no ribbon, "
         "no plaque, no tile behind it, no text, letters or numerals. ")
WELL = "The medallion's centre is an EMPTY sunken round WELL about 120 px across, flat dark INK/UMBRA, with nothing in it (the game places the achievement's own small glyph there). "
STAR = "The centre carries a raised emblem: a five-pointed STAR inside a small laurel wreath, in the same metal, readable at 24 px. "
TIERS = {
    "bronze": "BRONZE tier: a rim of dark weathered bronze (warm brown-orange metal with VERDIGRIS #4e8763 green-teal patina in the recesses), modest, a plain bevelled ring with 8 rivets.",
    "silver": "SILVER tier: a rim of cold pale silver steel (MIST #a4bcd6 and BONE highlights, MOON shadows), a finer ring with a beaded edge and 8 rivets.",
    "gold": "GOLD tier: a rim of worn GILT #b89448 gold (BONE glints, deep GILT-brown shadows) with a scalloped/sunburst edge of 16 short points and 8 rivets, clearly the richest of the three.",
}
jobs = []
for t, desc in TIERS.items():
    jobs.append({"id": f"badge_frame_{t}", "path": str(d / f"badge_frame_{t}.png"), "size": "256x256", "bg": TRANSPARENT,
                 "shown": "24-48 CSS px", "brief": MEDAL + desc + " " + WELL})
for t, desc in TIERS.items():
    jobs.append({"id": f"badge_{t}", "path": str(d / f"badge_{t}.png"), "size": "256x256", "bg": TRANSPARENT,
                 "shown": "24-48 CSS px", "brief": MEDAL + desc + " " + STAR})
jobs.append({"id": "badge_secret", "path": str(d / "badge_secret.png"), "size": "256x256", "bg": TRANSPARENT,
             "shown": "24-48 CSS px",
             "brief": MEDAL + "SECRET / HIDDEN tier: a rim of dark INK iron with an AMETHYST #8762a6 violet sheen (lit #bf9ad6 on the top edge), "
                      "the centre a dark well holding a single half-closed watching EYE sigil in pale AMETHYST/BONE (no question mark, no letters); "
                      "mysterious, clearly different from the three metal tiers."})
jobs.append({"id": "badge_locked", "path": str(d / "badge_locked.png"), "size": "256x256", "bg": TRANSPARENT,
             "shown": "24-48 CSS px",
             "brief": MEDAL + "LOCKED: the same medallion as a flat dim SILHOUETTE: one dark UMBRA/DUSK fill with only a faint MOON rim and a "
                      "subtle stepped-pixel texture, no metal colour, and a small simple PADLOCK shape in dull MOON grey in the centre. Low contrast "
                      "on purpose (an unearned slot), but the outer INK contour still crisp."})
batches["badges"] = ("ACHIEVEMENT BADGE UI icons", str(d), [ALERT, GOLD], jobs)

# --- 4. R4 dungeon weapon identity: the held weapon matches the sent weapon -------------------------------------
d = STAGE / "weapons"
HKEEP = ("EDIT the reference hero sprite. Keep the SAME character: canvas 1024x1536, the same face, hair, look (man / woman / cat-eared), "
         "outfit, armour, the long BLOOD cloak, colours, ink weight, scale and the figure's position and height in the canvas; keep the "
         "background transparent; no floor, shadow, scenery or text. Change ONLY the held weapon and the arms/hands holding it, as stated. "
         "The new weapon must read in SILHOUETTE alone at 48 px tall and must NOT resemble the weapon it replaces; draw it LARGE with a "
         "thick INK contour and a MIST moonlit rim on its edge. Remove every trace of the old weapon (no leftover bow limb, staff shaft, "
         "string or long barrel anywhere). ")
WEAPONS = {
    "sword": "a straight ARMING SWORD held forward-and-low in the right hand, blade angled down toward the lower right, a plain cross guard and "
             "leather grip, a bright MIST edge; the left hand free and clenched. The quiver on the back may stay. Clearly a SWORD, not a bow.",
    "dagger": "a short broad DAGGER held reversed (point down) in the right hand close to the hip, a small cross guard, MIST edge; the left hand "
              "open with a faint MIST glimmer of magic in the palm. NO staff anywhere. Clearly a robed caster with a DAGGER.",
    "bow": "a dark recurve LONGBOW held vertically in the left hand at full draw, the right hand drawing the string back to the cheek with a "
           "nocked arrow (MIST arrowhead); NO staff anywhere. Clearly a robed caster with a BOW.",
    "short_gun": "a SHORT flintlock PISTOL (a short gun, barrel no longer than a forearm) held in the right hand, arm extended forward at "
                 "shoulder height, aiming right, the stock a curved wooden grip with GILT fittings; the left hand at the belt. NO long rifle "
                 "and NO gun at the shoulder: the pistol is a compact one-handed shape, clearly shorter than the long shoulder gun.",
    "crownsplitter": "CROWNSPLITTER, a LEGENDARY two-handed great AXE held diagonally across the body in BOTH hands, the haft long and dark "
                     "with GILT bands, the head a huge broad crescent blade shaped like a CROWN split in two (a jagged notched crown silhouette "
                     "with two pointed tines along the top of the blade), worn GILT-LEAF gold (#a3752a, lit #e3b862) with a single BLOOD gem; "
                     "far broader and heavier than any sword, the widest shape on the figure. No shield.",
}
R4 = [("ranger", "sword"), ("caster", "dagger"), ("caster", "bow"), ("gunner", "short_gun"), ("fighter", "crownsplitter"), ("rogue", "crownsplitter")]
R4_BATCHES = {"weapons_a": R4[0:2], "weapons_b": R4[2:4], "weapons_c": R4[4:6]}
for bname, pairs in R4_BATCHES.items():
    jobs, refs = [], []
    for cls, wpn in pairs:
        for look in ("male", "female", "cat"):
            ref = str(ROOT / f"generated/hero_{cls}_{look}.png")
            refs.append(ref)
            jobs.append({"id": f"hero_{cls}_{look}_{wpn}", "path": str(d / f"hero_{cls}_{look}_{wpn}.png"), "size": "1024x1536", "bg": TRANSPARENT,
                         "ref": ref, "shown": "48 px tall in the dungeon",
                         "brief": HKEEP + f"The {cls.upper()} hero ({look} look) now wields " + WEAPONS[wpn]})
    batches[bname] = ("R4 WEAPON-IDENTITY hero sprites (the same heroes holding the weapon actually sent)", str(d), refs, jobs)

# R4 retry (review 2026-10-18: the first daggers sit against the robe at the hip and vanish at 48 px)
d2 = STAGE / "weapons_v2"
DAGGER2 = ("a LONG broad-bladed ritual DAGGER (blade about the length of the forearm, wide leaf-shaped MIST-rimmed steel, small GILT cross "
           "guard) held in the RIGHT hand with the arm EXTENDED forward and up to the right AWAY from the body, the blade pointing up and "
           "forward so the whole dagger sits against empty background, never in front of the robe; the left hand low with a faint MIST "
           "glimmer. NO staff anywhere. At 48 px the bright blade must be a clear separate spike beside the figure.")
jobs, refs = [], []
for look in ("male", "female", "cat"):
    ref = str(ROOT / f"generated/hero_caster_{look}.png")
    refs.append(ref)
    jobs.append({"id": f"hero_caster_{look}_dagger", "path": str(d2 / f"hero_caster_{look}_dagger.png"), "size": "1024x1536", "bg": TRANSPARENT,
                 "ref": ref, "shown": "48 px tall in the dungeon", "brief": HKEEP + f"The CASTER hero ({look} look) now wields " + DAGGER2})
batches["weapons_dagger_v2"] = ("R4 WEAPON-IDENTITY hero sprites, dagger retry", str(d2), refs, jobs)

# --- 5. town walk alternates: walk_<cls>_<look> for the looks without a painted walk ------------------------------
d = STAGE / "walk_alts"
PAINTED_WALK = {"rogue": "female", "ranger": "female"}
WALKS = []
for cls in ("fighter", "rogue", "ranger", "caster", "gunner", "clown", "engineer"):
    painted = PAINTED_WALK.get(cls, "male")
    for look in ("male", "female", "cat"):
        if look != painted:
            WALKS.append((cls, look))
for bname, pairs in {"walk_a": WALKS[:7], "walk_b": WALKS[7:]}.items():
    jobs, refs = [], []
    for cls, look in pairs:
        walk, idle = str(ROOT / f"generated/walk_{cls}.png"), str(ROOT / f"generated/hero_{cls}_{look}.png")
        refs += [walk, idle]
        jobs.append({"id": f"walk_{cls}_{look}", "path": str(d / f"walk_{cls}_{look}.png"), "size": "1024x1536", "bg": TRANSPARENT,
                     "ref": f"{walk} (the POSE) and {idle} (the LOOK)", "shown": "about 40 px tall in the town",
                     "brief": f"EDIT the walk sprite walk_{cls}.png into the SAME walking pose (walking right mid-stride, the same stride, "
                              f"leg and arm positions, class weapon carried at rest, BLOOD cloak trailing, same canvas 1024x1536, same scale and "
                              f"placement) but worn by the character in hero_{cls}_{look}.png: copy that hero's face, hair, "
                              + {"male": "a young man with SHORT dark hair and a broad square frame",
                                 "female": "a young woman with long dark hair (a braid or long locks) and a slimmer frame",
                                 "cat": "CAT-EARED: two tall pointed black cat ears on top of the head and a long black cat tail curling behind"}[look]
                              + ", and that hero's outfit details. Transparent background; no floor, shadow or text."})
    batches[bname] = ("TOWN WALK alternate-look sprites", str(d), refs, jobs)


def main() -> None:
    PROMPTS.mkdir(exist_ok=True)
    reg = {}
    for name, (what, out_dir, refs, jobs) in batches.items():
        text = head(what, Path(out_dir), refs) + jobs_text(jobs)
        (PROMPTS / f"cut267_{name}.txt").write_text(text)
        reg[name] = {"prompt": f"art/prompts/cut267_{name}.txt", "out": str(Path(out_dir).relative_to(REPO)), "jobs": [{k: v for k, v in j.items()} for j in jobs]}
        print(f"art/prompts/cut267_{name}.txt  {len(jobs)} jobs")
    STAGE.mkdir(parents=True, exist_ok=True)
    (STAGE / "generation-jobs.json").write_text(json.dumps({"tool": "codex exec + built-in image_gen", "date": "2026-10-18", "batches": reg}, indent=1) + "\n")


if __name__ == "__main__":
    main()
