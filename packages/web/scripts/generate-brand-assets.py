#!/usr/bin/env python3
"""Regenerate the full PetDate icon/brand package from pepito/img/logo.png.

Source of truth: packages/web/public/pepito/img/logo.png
(horizontal pink dog+cat mark + Pet Date wordmark).

Outputs:
  - favicon.svg / favicon.png / favicon.ico
  - apple-touch-icon.png
  - pwa-192.png, pwa-512.png, pwa-512-maskable.png
  - brand/petdate-mark.png, brand/petdate-mark-192.png
  - brand/petdate-og.png, brand/petdate-og.jpg  (full logo, not neon banner)
  - brand/petdate-channel.png (full logo square share)
  - packages/api/assets/brand/petdate-email-logo.png
"""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]  # packages/web
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
LOGO = PUBLIC / "pepito" / "img" / "logo.png"
API_EMAIL = ROOT.parent / "api" / "assets" / "brand" / "petdate-email-logo.png"

SOFT = (244, 244, 247, 255)
OG_TOP = (252, 240, 248, 255)
OG_BOTTOM = (244, 244, 247, 255)


def load_logo() -> Image.Image:
    if not LOGO.is_file():
        raise SystemExit(f"Missing source logo: {LOGO}")
    return Image.open(LOGO).convert("RGBA")


def extract_mark(logo: Image.Image) -> Image.Image:
    """Crop the left dog+cat heart before the wordmark gap."""
    w, h = logo.size
    pixels = logo.load()
    col_counts: list[int] = []
    for x in range(w):
        c = 0
        for y in range(h):
            r, g, b, a = pixels[x, y]
            if a >= 20 and r + g + b >= 40:
                c += 1
        col_counts.append(c)

    start = next(i for i, c in enumerate(col_counts) if c > 5)
    empty_run = 0
    gap_start = None
    for i in range(start, w):
        if col_counts[i] < 3:
            empty_run += 1
            if empty_run >= 8:
                gap_start = i - empty_run + 1
                break
        else:
            empty_run = 0
    if gap_start is None:
        gap_start = w

    mxs: list[int] = []
    mys: list[int] = []
    for y in range(h):
        for x in range(start, gap_start):
            r, g, b, a = pixels[x, y]
            if a >= 20 and r + g + b >= 40:
                mxs.append(x)
                mys.append(y)

    pad = 2
    left = max(0, min(mxs) - pad)
    top = max(0, min(mys) - pad)
    right = min(w, max(mxs) + pad + 1)
    bottom = min(h, max(mys) + pad + 1)
    mark = logo.crop((left, top, right, bottom)).copy()

    mp = mark.load()
    for y in range(mark.size[1]):
        for x in range(mark.size[0]):
            rr, gg, bb, aa = mp[x, y]
            if rr + gg + bb < 45:
                mp[x, y] = (0, 0, 0, 0)
    return mark


def fit_on_canvas(
    asset: Image.Image,
    size: tuple[int, int],
    *,
    bg: tuple[int, int, int, int] = SOFT,
    content_ratio: float = 0.68,
    maskable_safe: bool = False,
) -> Image.Image:
    canvas = Image.new("RGBA", size, bg)
    aw, ah = asset.size
    cw, ch = size
    ratio = 0.55 if maskable_safe else content_ratio
    target = int(min(cw, ch) * ratio)
    scale = target / max(aw, ah)
    nw, nh = max(1, int(aw * scale)), max(1, int(ah * scale))
    resized = asset.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (cw - nw) // 2
    oy = (ch - nh) // 2
    canvas.alpha_composite(resized, (ox, oy))
    return canvas


def make_square_icon(mark: Image.Image, size: int, content_ratio: float = 0.68) -> Image.Image:
    return fit_on_canvas(mark, (size, size), content_ratio=content_ratio)


def vertical_gradient(size: tuple[int, int], top: tuple, bottom: tuple) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        a = int(top[3] + (bottom[3] - top[3]) * t)
        for x in range(w):
            px[x, y] = (r, g, b, a)
    return img


def make_og(logo: Image.Image) -> Image.Image:
    w, h = 1200, 630
    canvas = vertical_gradient((w, h), OG_TOP, OG_BOTTOM)
    target_w = int(w * 0.72)
    scale = target_w / logo.size[0]
    nw, nh = max(1, int(logo.size[0] * scale)), max(1, int(logo.size[1] * scale))
    if nh > int(h * 0.42):
        scale = (h * 0.42) / logo.size[1]
        nw, nh = max(1, int(logo.size[0] * scale)), max(1, int(logo.size[1] * scale))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (w - nw) // 2
    oy = (h - nh) // 2
    canvas.alpha_composite(resized, (ox, oy))
    return canvas


def make_channel_square(logo: Image.Image, size: int = 1024) -> Image.Image:
    under = vertical_gradient((size, size), OG_TOP, OG_BOTTOM)
    overlay = fit_on_canvas(logo, (size, size), bg=(0, 0, 0, 0), content_ratio=0.78)
    under.alpha_composite(overlay)
    return under


def write_favicon_svg(mark: Image.Image, dest: Path) -> None:
    buf = io.BytesIO()
    side = max(mark.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(mark, ((side - mark.size[0]) // 2, (side - mark.size[1]) // 2))
    sq.resize((128, 128), Image.Resampling.LANCZOS).save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Pet Date">
  <!-- Derived from packages/web/public/pepito/img/logo.png (mark crop) -->
  <image href="data:image/png;base64,{b64}" width="128" height="128" preserveAspectRatio="xMidYMid meet"/>
</svg>
"""
    dest.write_text(svg, encoding="utf-8")


def save_png(im: Image.Image, path: Path, *, rgb: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = im.convert("RGB") if rgb else im
    out.save(path, "PNG", optimize=True)


def main() -> int:
    BRAND.mkdir(parents=True, exist_ok=True)
    API_EMAIL.parent.mkdir(parents=True, exist_ok=True)

    logo = load_logo()
    mark = extract_mark(logo)
    print(f"Source: {LOGO} ({logo.size[0]}x{logo.size[1]})")
    print(f"Mark crop: {mark.size[0]}x{mark.size[1]}")

    pwa_512 = make_square_icon(mark, 512, 0.68)
    pwa_192 = make_square_icon(mark, 192, 0.68)
    apple = make_square_icon(mark, 180, 0.70)
    maskable = fit_on_canvas(mark, (512, 512), content_ratio=0.55, maskable_safe=True)
    favicon_32 = make_square_icon(mark, 32, 0.78)
    save_png(pwa_512, PUBLIC / "pwa-512.png", rgb=True)
    save_png(pwa_192, PUBLIC / "pwa-192.png", rgb=True)
    save_png(apple, PUBLIC / "apple-touch-icon.png", rgb=True)
    save_png(maskable, PUBLIC / "pwa-512-maskable.png", rgb=True)
    save_png(favicon_32, PUBLIC / "favicon.png", rgb=True)
    save_png(pwa_512, BRAND / "petdate-mark.png", rgb=True)
    save_png(pwa_192, BRAND / "petdate-mark-192.png", rgb=True)

    # Email CID: full horizontal pepito logo on soft bg (not neon circle).
    email_w = 240
    scale = email_w / logo.size[0]
    enw, enh = max(1, int(logo.size[0] * scale)), max(1, int(logo.size[1] * scale))
    email_logo = logo.resize((enw, enh), Image.Resampling.LANCZOS)
    pad_x, pad_y = 12, 10
    email_canvas = Image.new("RGBA", (enw + pad_x * 2, enh + pad_y * 2), SOFT)
    email_canvas.alpha_composite(email_logo, (pad_x, pad_y))
    save_png(email_canvas, API_EMAIL, rgb=True)

    # Reliable multi-size ICO from the 512 mark canvas
    ico_base = pwa_512.convert("RGBA")
    ico_base.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

    write_favicon_svg(mark, PUBLIC / "favicon.svg")

    og = make_og(logo)
    save_png(og, BRAND / "petdate-og.png")
    og.convert("RGB").save(BRAND / "petdate-og.jpg", "JPEG", quality=90, optimize=True)

    save_png(make_channel_square(logo, 1024), BRAND / "petdate-channel.png")
    og.convert("RGB").save(BRAND / "petdate-banner.jpg", "JPEG", quality=90, optimize=True)

    repo = ROOT.parent.parent
    print("Wrote:")
    for p in [
        PUBLIC / "favicon.ico",
        PUBLIC / "favicon.png",
        PUBLIC / "favicon.svg",
        PUBLIC / "apple-touch-icon.png",
        PUBLIC / "pwa-192.png",
        PUBLIC / "pwa-512.png",
        PUBLIC / "pwa-512-maskable.png",
        BRAND / "petdate-mark.png",
        BRAND / "petdate-mark-192.png",
        BRAND / "petdate-og.png",
        BRAND / "petdate-og.jpg",
        BRAND / "petdate-channel.png",
        BRAND / "petdate-banner.jpg",
        API_EMAIL,
    ]:
        rel = p.relative_to(repo) if p.is_relative_to(repo) else p
        print(f"  {rel} ({p.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
