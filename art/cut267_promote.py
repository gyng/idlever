#!/usr/bin/env python3
"""Cut267 (2026-10-18): promote the selected staging candidates (art/staging/cut267/) into the shipped sources.

  chest  -> art/ui/fx/chest_*.png      fixed 1024 canvas (every frame the same size; tools/ui-skin.py packs painted + _px cuts)
            black-ground glows (rays, ring) become straight alpha from brightness; the ring also gets five rarity tints
  vat    -> art/generated/town_service_device_{grow_0,grow_1,grow_2,ready}.png   (the glass region composited onto the idle
            master so the silhouette, and so the packed/drawn size, is the idle vat's exactly)
  badges -> art/ui/icons/badge_*.png   256x256 RGBA
  hero / walk sprites -> art/generated/<id>.png as delivered (pack.py keys and sizes them)

Run: python3 art/cut267_promote.py chest|vat|badges|sprites [ids...]   (a `--from <dir>` picks another candidate dir)
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
STAGE = ROOT / "staging" / "cut267"
RARITY_LIT = {"common": "#b3ad9b", "uncommon": "#86bc95", "rare": "#8eafe0", "epic": "#bf9ad6", "legendary": "#e3b862"}  # ART_DIRECTION §7
VAT_GLASS = (590, 215, 945, 605)   # the glass cylinder in the 1536x1024 vat masters (measured on town_service_device_active_0)


def rgba(p: Path) -> np.ndarray:
    """Float RGBA with the background removed: authored alpha, else a flat magenta/blue key off the corners."""
    a = np.asarray(Image.open(p).convert("RGBA"), np.float32)
    if min(a[0, 0, 3], a[0, -1, 3], a[-1, 0, 3], a[-1, -1, 3]) < 240:
        return a
    k = np.median(np.array([a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]])[:, :3], 0)
    dist = np.sqrt(((a[..., :3] - k) ** 2).sum(-1))
    a[..., 3] = np.clip((dist - 30) / 100, 0, 1) * 255
    return a


def glow(p: Path) -> np.ndarray:
    """A glow painted on black: alpha = brightness (max channel), colour un-premultiplied."""
    rgb = np.asarray(Image.open(p).convert("RGB"), np.float32)
    alpha = rgb.max(-1)
    alpha = np.where(alpha < 10, 0, alpha)   # the black's compression noise stays fully transparent
    col = np.where(alpha[..., None] > 0, rgb * 255 / np.maximum(alpha[..., None], 1), 0)
    return np.dstack([np.clip(col, 0, 255), alpha])


def save(a: np.ndarray, p: Path) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").save(p, optimize=True)
    print(f"  {p.relative_to(ROOT.parent)}  {Image.open(p).size}")


def tint(a: np.ndarray, hex_: str) -> np.ndarray:
    """A neutral glow toward a rarity pigment: the hue on the body, the near-white core kept hot."""
    c = np.array([int(hex_[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
    lum = a[..., :3].mean(-1, keepdims=True) / 255
    hot = np.clip((lum - 0.9) / 0.1, 0, 1) ** 2   # only the brightest core stays near white
    out = a.copy()
    out[..., :3] = c * np.clip(lum * 1.15, 0, 1) * (1 - hot) + 255 * hot
    return out


def chest(src: Path) -> None:
    out = ROOT / "ui" / "fx"
    for n in ("chest_boss_closed", "chest_boss_cracked", "chest_boss_open", "chest_fx_sparks"):
        a = rgba(src / f"{n}.png")
        size = (1024, 512) if n == "chest_fx_sparks" else (1024, 1024)
        if a.shape[1::-1] != size:
            a = np.asarray(Image.fromarray(a.astype(np.uint8), "RGBA").resize(size, Image.LANCZOS), np.float32)
        a[[0, -1], :, 3] = 0   # tools/ui-skin.py `usable`: transparent corners
        a[:, [0, -1], 3] = 0
        save(a, out / f"{n}.png")
    for n in ("chest_fx_rays", "chest_fx_ring"):
        a = glow(src / f"{n}.png")
        if a.shape[:2] != (1024, 1024):
            a = np.asarray(Image.fromarray(a.astype(np.uint8), "RGBA").resize((1024, 1024), Image.LANCZOS), np.float32)
        a[[0, -1], :, 3] = 0
        a[:, [0, -1], 3] = 0
        save(a, out / f"{n}.png")
        if n == "chest_fx_ring":
            for tier, hx in RARITY_LIT.items():
                save(tint(a, hx), out / f"chest_fx_ring_{tier}.png")


def vat(src: Path, ids: list[str]) -> None:
    idle = np.asarray(Image.open(ROOT / "generated/town_service_device.png").convert("RGBA"), np.float32)
    x0, y0, x1, y1 = VAT_GLASS
    for n in ids or ["town_service_device_grow_0", "town_service_device_grow_1", "town_service_device_grow_2", "town_service_device_ready"]:
        a = rgba(src / f"{n}.png")
        if a.shape[:2] != idle.shape[:2]:
            a = np.asarray(Image.fromarray(a.astype(np.uint8), "RGBA").resize(idle.shape[1::-1], Image.LANCZOS), np.float32)
        out = idle.copy()
        out[y0:y1, x0:x1] = a[y0:y1, x0:x1]
        save(out, ROOT / "generated" / f"{n}.png")


def badges(src: Path, ids: list[str]) -> None:
    for p in sorted(src.glob("badge_*.png")):
        if ids and p.stem not in ids:
            continue
        a = rgba(p)
        if a.shape[:2] != (256, 256):
            a = np.asarray(Image.fromarray(a.astype(np.uint8), "RGBA").resize((256, 256), Image.LANCZOS), np.float32)
        save(a, ROOT / "ui" / "icons" / p.name)


def sprites(src: Path, ids: list[str]) -> None:
    import shutil
    for n in ids:   # pack.py keys these itself (transparent or magenta corners)
        shutil.copyfile(src / f"{n}.png", ROOT / "generated" / f"{n}.png")
        print(f"  art/generated/{n}.png  {Image.open(ROOT / 'generated' / f'{n}.png').size}")


def main(argv: list[str]) -> int:
    what, rest = argv[0], argv[1:]
    src = None
    if "--from" in rest:
        i = rest.index("--from")
        src = Path(rest[i + 1])
        rest = rest[:i] + rest[i + 2:]
    if what == "chest":
        chest(src or STAGE / "boss_chest")
    elif what == "vat":
        vat(src or STAGE / "clone_vat", rest)
    elif what == "badges":
        badges(src or STAGE / "badges", rest)
    elif what == "sprites":
        sprites(src, rest)
    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
