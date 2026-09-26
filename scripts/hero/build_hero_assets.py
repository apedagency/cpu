"""Build the layered Hero assets in public/hero/ from existing CPU art.

Nothing here draws the character. Every CPU pixel comes from the approved
campaign render; the other layers are either derived from campaign art or
rendered procedurally (glass, light) from the official Hyperliquid mark path.

  character   CPU_SITE_VISUALS_40/hero/05-hero-silhouette.webp, matted with
              rembg BiRefNet, edge colours unmixed from the dark backdrop
  plate       CPU_SITE_VISUALS_40/lore/13-long-horizon.webp, the empty right
              side (no character), mirrored, softened and graded darker
  hl objects  assets/brand-official/hyperliquid-mark.svg, shaded as glass
  the rest    halo, floor shadow/reflection, visor mask + highlight, glass sheen

Requires: pip install pillow numpy opencv-python "rembg[cpu]"
Run from the repo root:  python scripts/hero/build_hero_assets.py
Writes public/hero/*.webp, assets/hero/hero-character-main.png (master) and
assets/hero/manifest.json (provenance + the layout numbers hero.tsx uses).
"""

import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "hero"
MASTER = ROOT / "assets" / "hero"
SRC_CHARACTER = ROOT / "CPU_SITE_VISUALS_40" / "hero" / "05-hero-silhouette.webp"
SRC_PLATE = ROOT / "CPU_SITE_VISUALS_40" / "lore" / "13-long-horizon.webp"
SRC_MARK = ROOT / "assets" / "brand-official" / "hyperliquid-mark.svg"

MINT = np.array([151, 252, 228], np.float32) / 255
TEAL = np.array([0, 240, 230], np.float32) / 255
FOREST = np.array([25, 101, 66], np.float32) / 255
WHITE = np.ones(3, np.float32)

CHARACTER_HEIGHT = 1600  # production height; ~2x the largest on-screen size
rng = np.random.default_rng(7)


# --------------------------------------------------------------------------- io

def save_webp(rgba, name, quality=88, lossless=False):
    arr = np.clip(rgba * 255 + 0.5, 0, 255).astype(np.uint8)
    mode = "RGBA" if arr.shape[-1] == 4 else "RGB"
    path = OUT / name
    Image.fromarray(arr, mode).save(path, "WEBP", quality=quality, method=6, lossless=lossless)
    print(f"  {name:32s} {arr.shape[1]}x{arr.shape[0]}  {path.stat().st_size / 1024:.0f} KB")
    return path


def resize(rgba, w, h):
    """Area resize in premultiplied space so edges don't pick up dark fringes."""
    if rgba.shape[-1] != 4:
        return cv2.resize(rgba, (w, h), interpolation=cv2.INTER_AREA)
    prem = rgba.copy()
    prem[..., :3] *= prem[..., 3:4]
    out = cv2.resize(prem, (w, h), interpolation=cv2.INTER_AREA)
    a = out[..., 3:4]
    out[..., :3] = np.clip(out[..., :3] / np.maximum(a, 1e-4), 0, 1)
    return out


def dither(x, amount=1.0):
    return x + (rng.random(x.shape, np.float32) - 0.5) * (amount / 255)


# -------------------------------------------------------------------- character

def build_character():
    from rembg import new_session, remove

    src = Image.open(SRC_CHARACTER).convert("RGB")
    ox = 850
    crop = src.crop((ox, 0, 3050, src.height))
    mask = remove(crop, session=new_session("birefnet-general-lite"), only_mask=True)

    C = np.asarray(crop, np.float32) / 255
    A = np.asarray(mask, np.float32) / 255
    A = np.where(A < 0.02, 0, np.where(A > 0.985, 1, A))

    # Unmix edge colours from the backdrop so fur edges hold on any ground.
    bg_w = (A < 0.05).astype(np.float32)
    B = cv2.GaussianBlur(C * bg_w[..., None], (0, 0), 25) / np.maximum(cv2.GaussianBlur(bg_w, (0, 0), 25), 1e-4)[..., None]
    fg_w = (A > 0.9).astype(np.float32)
    F_est = cv2.GaussianBlur(C * fg_w[..., None], (0, 0), 6) / np.maximum(cv2.GaussianBlur(fg_w, (0, 0), 6), 1e-4)[..., None]
    a = A[..., None]
    F = np.clip((C - (1 - a) * B) / np.maximum(a, 1e-3), 0, 1)
    trust = np.clip((a - 0.15) / 0.35, 0, 1)
    F = np.where(a >= 0.985, C, F * trust + F_est * (1 - trust))

    ys, xs = np.where(A > 0.02)
    pad = 20
    x0, x1 = max(0, xs.min() - pad), min(C.shape[1], xs.max() + pad + 1)
    y0, y1 = max(0, ys.min() - pad), min(C.shape[0], ys.max() + pad + 1)
    master = np.dstack([F, A])[y0:y1, x0:x1].astype(np.float32)

    MASTER.mkdir(parents=True, exist_ok=True)
    Image.fromarray((master * 255 + 0.5).astype(np.uint8), "RGBA").save(MASTER / "hero-character-main.png", optimize=True)
    print(f"  master hero-character-main.png {master.shape[1]}x{master.shape[0]}")
    return master, (ox + x0, y0)


def character_metrics(ch):
    H, W = ch.shape[:2]
    a = ch[..., 3]
    rgb = ch[..., :3]
    rows = np.where((a > 0.5).any(axis=1))[0]
    feet = rows.max()
    top = rows.min()

    # Visor: the largest dark, opaque blob in the head band, holes filled.
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    hy0, hy1, hx0, hx1 = int(0.10 * H), int(0.30 * H), int(0.35 * W), int(0.92 * W)
    dark = np.zeros((H, W), np.uint8)
    dark[hy0:hy1, hx0:hx1] = ((lum < 0.22) & (a > 0.9))[hy0:hy1, hx0:hx1]
    ell = lambda s: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (s, s))
    dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, ell(max(3, W // 92)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(dark, 8)
    visor = (lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    ff = visor.copy()
    cv2.floodFill(ff, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 1)
    visor |= (ff == 0).astype(np.uint8)
    visor = cv2.morphologyEx(visor, cv2.MORPH_CLOSE, ell(max(3, W // 45)))
    visor = cv2.morphologyEx(visor, cv2.MORPH_OPEN, ell(max(3, W // 150)))
    soft = cv2.GaussianBlur(visor.astype(np.float32), (0, 0), max(1.0, W / 460))
    soft = np.clip((soft - 0.5) * 3 + 0.5, 0, 1)
    vy, vx = np.where(soft > 0.5)

    # Body axis without the tail: centre of mass of the upper 70% silhouette.
    body = a[: int(0.7 * H)]
    cy_, cx_ = np.where(body > 0.5)
    return {
        "feet": feet,
        "top": top,
        "visor_soft": soft,
        "visor_box": (vx.min(), vy.min(), vx.max() + 1, vy.max() + 1),
        "body_cx": float(cx_.mean()),
    }


def build_visor_layers(ch, m):
    H, W = ch.shape[:2]
    x0, y0, x1, y1 = m["visor_box"]
    pad = max(4, W // 180)
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    shape = m["visor_soft"][y0:y1, x0:x1]
    # Pull the edge in a touch so glints never spill onto the fur.
    shape = cv2.erode(shape, np.ones((3, 3), np.uint8))
    mask = np.dstack([np.ones(shape.shape + (3,), np.float32), shape])
    save_webp(mask, "hero-visor-mask.webp", lossless=True)

    # A glint that slides across the glass: one broad soft band, one hairline.
    h, w = shape.shape
    tw = int(w * 1.6)
    yy, xx = np.mgrid[0:h, 0:tw].astype(np.float32)
    u, v = xx / tw, yy / h
    def band(center, width, strength):
        c = center + 0.10 * (v - 0.5) - 0.05 * (v - 0.5) ** 2
        return strength * np.exp(-(((u - c) / width) ** 2))
    fall = np.clip(1.15 - v, 0, 1) ** 1.4
    glint = (band(0.40, 0.045, 0.62) + band(0.465, 0.010, 0.95)) * fall
    rgb = WHITE * (1 - 0.25 * np.clip(glint, 0, 1))[..., None] + MINT * 0.25 * np.clip(glint, 0, 1)[..., None]
    save_webp(np.dstack([rgb, np.clip(glint, 0, 1)]), "hero-visor-highlight.webp", quality=90)
    return {"x0": x0, "y0": y0, "x1": x1, "y1": y1, "highlight_scale": tw / w}


def build_shadow(ch, m):
    """Contact shadow + wet-floor reflection + mint light spill, below the feet."""
    H, W = ch.shape[:2]
    feet = m["feet"]
    above = int(0.05 * H)
    below = int(0.31 * H)
    h = above + below
    out_p = np.zeros((h, W, 4), np.float32)  # premultiplied

    def over(dst, rgb, alpha):
        dst[..., :3] = rgb * alpha[..., None] + dst[..., :3] * (1 - alpha[..., None])
        dst[..., 3] = alpha + dst[..., 3] * (1 - alpha)

    yy, xx = np.mgrid[0:h, 0:W].astype(np.float32)
    cx = m["body_cx"]

    # Light spill from the boots and the halo.
    spill = 0.22 * np.exp(-(((xx - cx) / (0.42 * W)) ** 2 + ((yy - above) / (0.035 * H)) ** 2))
    over(out_p, MINT, spill)

    # Occlusion under each boot.
    a = ch[..., 3]
    soles = (a[feet - int(0.035 * H): feet + 1] > 0.5).any(axis=0).astype(np.uint8)[None, :]
    n, lab, stats, _ = cv2.connectedComponentsWithStats(np.repeat(soles, 3, 0), 8)
    occ = np.zeros((h, W), np.float32)
    for i in range(1, n):
        x, _, w, _, area = stats[i]
        if w < 0.04 * W:
            continue
        col = np.where((a[:, x:x + w] > 0.5).any(axis=1))[0]
        foot_y = col.max() - feet + above
        ex = x + w / 2
        occ = np.maximum(occ, np.exp(-(((xx - ex) / (0.62 * w)) ** 2 + ((yy - foot_y) / (0.012 * H)) ** 2)))
    occ = cv2.GaussianBlur(occ, (0, 0), 0.006 * H) * 0.85
    over(out_p, np.zeros(3, np.float32), occ)

    # Reflection: mirrored about the sole line, fading and softening with distance.
    flip = ch[feet - below: feet + 1][::-1].copy()
    ref = np.zeros((h, W, 4), np.float32)
    ref[above: above + flip.shape[0]] = flip[: h - above]
    prem = ref.copy()
    prem[..., :3] *= prem[..., 3:4]
    levels = [prem] + [cv2.GaussianBlur(prem, (0, 0), s * H / 1000) for s in (4, 10, 20)]
    d = np.clip((yy - above) / below, 0, 1)
    t = d * (len(levels) - 1)
    lo = np.floor(t).astype(int)
    frac = (t - lo)[..., None]
    stack = np.stack(levels)
    hi = np.minimum(lo + 1, len(levels) - 1)
    blurred = stack[lo, yy.astype(int), xx.astype(int)] * (1 - frac) + stack[hi, yy.astype(int), xx.astype(int)] * frac
    fade = (0.5 * (1 - d) ** 2.0)[..., None]
    tint = np.array([0.55, 0.78, 0.74], np.float32)
    r_alpha = blurred[..., 3] * fade[..., 0]
    r_rgb = blurred[..., :3] / np.maximum(blurred[..., 3:4], 1e-4) * tint
    over(out_p, r_rgb, r_alpha)

    a_out = np.clip(out_p[..., 3], 0, 1)
    rgb = np.clip(out_p[..., :3] / np.maximum(a_out[..., None], 1e-4), 0, 1)
    return np.dstack([rgb, a_out]), (feet - above) / H, h / H


# ------------------------------------------------------------------------ plate

def build_plate():
    src = np.asarray(Image.open(SRC_PLATE).convert("RGB"), np.float32) / 255
    # The empty right side of the skyline (the small cat lives left of x=1300),
    # mirrored so the tower sits behind the title veil, not the character.
    plate = src[:, 1300:][:, ::-1]
    plate = cv2.GaussianBlur(plate, (0, 0), 2.6)
    lum = plate @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    grey = np.repeat(lum[..., None], 3, -1)
    plate = grey + (plate - grey) * 0.9
    plate = np.clip(plate * 0.78, 0, 1) ** 1.12
    ground = np.array([2, 12, 10], np.float32) / 255
    plate = plate + ground * (1 - np.clip(plate * 6, 0, 1))
    h, w = plate.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    vig = 1 - 0.35 * np.clip(((xx / w - 0.5) / 0.62) ** 2 + ((yy / h - 0.62) / 0.75) ** 2, 0, 1)
    plate = plate * vig[..., None]
    out_w = 2400
    out_h = round(h * out_w / w)
    plate = cv2.resize(plate, (out_w, out_h), interpolation=cv2.INTER_AREA)
    save_webp(dither(plate, 1.5).clip(0, 1), "hero-background-plate.webp", quality=80)
    return out_w, out_h


# ------------------------------------------------------------------ glass & light

def mark_mask(width):
    """Rasterise the official Hyperliquid mark path (M/c/s/Z) with 4x AA."""
    d = re.search(r' d="([^"]+)"', SRC_MARK.read_text()).group(1)
    tokens = re.findall(r"[MmCcSsZz]|-?\d*\.?\d+(?:e-?\d+)?", d)
    pts, cur, start, prev_ctrl, cmd, i = [], np.zeros(2), np.zeros(2), None, None, 0
    nums = lambda k: np.array([float(t) for t in tokens[i:i + k]])
    def bez(p0, p1, p2, p3):
        t = np.linspace(0, 1, 24)[:, None]
        return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3
    while i < len(tokens):
        if re.match(r"[A-Za-z]", tokens[i]):
            cmd = tokens[i]; i += 1
            if cmd in "Zz":
                cur = start.copy(); continue
        if cmd in "Mm":
            p = nums(2); i += 2
            cur = p + (cur if cmd == "m" else 0); start = cur.copy(); pts.append(cur[None]); cmd = "l" if cmd == "m" else "L"
        elif cmd in "Cc":
            v = nums(6).reshape(3, 2); i += 6
            if cmd == "c": v = v + cur
            pts.append(bez(cur, v[0], v[1], v[2])); prev_ctrl, cur = v[1], v[2]
        elif cmd in "Ss":
            v = nums(4).reshape(2, 2); i += 4
            if cmd == "s": v = v + cur
            c1 = 2 * cur - prev_ctrl if prev_ctrl is not None else cur
            pts.append(bez(cur, c1, v[0], v[1])); prev_ctrl, cur = v[0], v[1]
    poly = np.concatenate(pts)
    lo, hi = poly.min(0), poly.max(0)
    ss = 4
    scale = width * ss / (hi - lo)[0]
    size = np.ceil((hi - lo) * scale).astype(int) + 2
    canvas = np.zeros((size[1], size[0]), np.uint8)
    cv2.fillPoly(canvas, [np.round((poly - lo) * scale).astype(np.int32)], 255)
    m = cv2.resize(canvas.astype(np.float32) / 255, (size[0] // ss, size[1] // ss), interpolation=cv2.INTER_AREA)
    return m


def _n(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-6)


def render_glass(mask, inflate=0.26, steep=3.2, body_alpha=0.22):
    """Shade an antialiased mask as inflated mint glass (straight-alpha RGBA)."""
    h_px, w_px = mask.shape
    size = max(h_px, w_px)
    m = mask.astype(np.float32)
    sig = inflate * min(h_px, w_px) * 0.5
    hf = cv2.GaussianBlur(m, (0, 0), sig)
    hf = np.clip((hf - 0.5) * 2.0, 0, 1) * (m > 0.02)
    hf = np.sqrt(np.clip(1 - (1 - hf) ** 2, 0, 1))
    hf = cv2.GaussianBlur(hf, (0, 0), 1.2)
    gy, gx = np.gradient(hf)
    nrm = _n(np.dstack([-gx * steep * sig, -gy * steep * sig, np.ones_like(hf)]))
    nz = np.clip(nrm[..., 2], 0, 1)
    refl = np.dstack([2 * nz * nrm[..., 0], 2 * nz * nrm[..., 1], 2 * nz * nz - 1])
    fres = 0.06 + 0.94 * (1 - nz) ** 3.0
    key = _n(np.array([-0.45, -0.72, 0.52], np.float32))
    rim = _n(np.array([0.75, 0.45, 0.3], np.float32))
    sky = np.clip((0.15 - refl[..., 1]) / 0.95, 0, 1) ** 1.6
    bounce = np.clip(refl[..., 1], 0, 1) ** 2
    spec_key = np.exp(-(1 - np.clip(refl @ key, -1, 1)) / 0.035)
    spec_rim = np.exp(-(1 - np.clip(refl @ rim, -1, 1)) / 0.08)
    env = WHITE * (1.3 * spec_key + 0.42 * sky)[..., None] + MINT * (0.75 * spec_rim + 0.35 * bounce)[..., None]
    dist = cv2.distanceTransform((m > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    edge = np.exp(-dist / (0.008 * size)) * (m > 0.02)
    band = np.exp(-((dist - 0.05 * size) ** 2) / (2 * (0.035 * size) ** 2))
    core = np.clip(hf, 0, 1) ** 3
    a_body = body_alpha * (0.55 + 0.45 * core) + 0.18 * band * (1 - core)
    body = MINT * (0.18 + 0.30 * core)[..., None] * (1 - 0.5 * band[..., None])
    rgb_p = body * a_body[..., None] + env * (0.25 + 0.75 * fres)[..., None] * 0.9 + MINT * (0.85 * edge)[..., None]
    alpha = np.clip(a_body + rgb_p.max(axis=-1) * 0.95, 0, 1) * m
    rgb_p = np.minimum(rgb_p, alpha[..., None] + 1e-6) * m[..., None]
    rgb = rgb_p / np.maximum(alpha[..., None], 1e-4)
    return np.dstack([np.clip(rgb, 0, 1), alpha]).astype(np.float32)


def tilt(rgba, ry=0.0, rx=0.0, rz=0.0, f=1.6, pad=0.12):
    """Turn a flat card in 3D (radians) and project it."""
    h, w = rgba.shape[:2]
    P = int(pad * max(h, w))
    src = cv2.copyMakeBorder(rgba, P, P, P, P, cv2.BORDER_CONSTANT, value=0)
    H, W = src.shape[:2]
    cx, cy, F = W / 2, H / 2, f * max(W, H)
    Rx = np.array([[1, 0, 0], [0, np.cos(rx), -np.sin(rx)], [0, np.sin(rx), np.cos(rx)]])
    Ry = np.array([[np.cos(ry), 0, np.sin(ry)], [0, 1, 0], [-np.sin(ry), 0, np.cos(ry)]])
    Rz = np.array([[np.cos(rz), -np.sin(rz), 0], [np.sin(rz), np.cos(rz), 0], [0, 0, 1]])
    R = Rz @ Ry @ Rx
    pts = np.array([[0, 0], [W, 0], [W, H], [0, H]], np.float32)
    dst = []
    for x, y in pts:
        p = R @ np.array([x - cx, y - cy, 0.0])
        s = F / (F + p[2])
        dst.append([cx + p[0] * s, cy + p[1] * s])
    M = cv2.getPerspectiveTransform(pts, np.array(dst, np.float32))
    prem = src.copy()
    prem[..., :3] *= prem[..., 3:4]
    out = cv2.warpPerspective(prem, M, (W, H), flags=cv2.INTER_CUBIC, borderValue=0)
    a = np.clip(out[..., 3:4], 0, 1)
    return np.dstack([np.clip(out[..., :3] / np.maximum(a, 1e-4), 0, 1), a]).astype(np.float32)


def trim(rgba, pad=8, thr=0.004):
    ys, xs = np.where(rgba[..., 3] > thr)
    return rgba[max(0, ys.min() - pad):ys.max() + pad + 1, max(0, xs.min() - pad):xs.max() + pad + 1]


def build_hl_objects():
    m = cv2.copyMakeBorder(mark_mask(820), 60, 60, 60, 60, cv2.BORDER_CONSTANT, value=0)
    mark = trim(tilt(render_glass(m), ry=0.2, rx=-0.12, rz=-0.14))
    mark = resize(mark, 560, round(mark.shape[0] * 560 / mark.shape[1]))
    save_webp(mark, "hero-hl-object-1.webp", quality=90)

    # A second mark turned the other way, defocused: it sits nearest the lens
    # (pre-blurred here so there is no CSS blur at runtime).
    m2 = cv2.copyMakeBorder(mark_mask(620), 60, 60, 60, 60, cv2.BORDER_CONSTANT, value=0)
    peb = trim(tilt(render_glass(m2), ry=-0.42, rx=0.3, rz=0.5), pad=40)
    peb = resize(peb, 420, round(peb.shape[0] * 420 / peb.shape[1]))
    prem = peb.copy()
    prem[..., :3] *= prem[..., 3:4]
    prem = cv2.GaussianBlur(prem, (0, 0), 6.0)
    a = prem[..., 3:4]
    peb = np.dstack([np.clip(prem[..., :3] / np.maximum(a, 1e-4), 0, 1), a])
    save_webp(peb, "hero-hl-object-2.webp", quality=88)
    return mark.shape[1] / mark.shape[0], peb.shape[1] / peb.shape[0]


def build_halo():
    s = 512
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float32)
    x, y = (xx / s - 0.5) * 2, (yy / s - 0.5) * 2
    r = np.sqrt(x ** 2 + (y / 1.18) ** 2)
    core = np.exp(-((r / 0.34) ** 2))
    wide = np.exp(-((r / 0.72) ** 2))
    alpha = np.clip(0.7 * core + 0.3 * wide, 0, 1) * np.clip((1 - r) / 0.18, 0, 1)
    mix = np.clip(core * 1.2, 0, 1)[..., None]
    rgb = MINT * mix + TEAL * (1 - mix) * 0.85 + FOREST * 0.15 * (1 - mix)
    save_webp(np.dstack([np.clip(rgb, 0, 1), alpha]), "hero-backlight-halo.webp", quality=90)


def build_foreground_glass():
    w, h = 1280, 720
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h * (h / w)

    def sheen(p0, p1, width, strength):
        p0, p1 = np.array(p0, np.float32), np.array(p1, np.float32)
        d = p1 - p0
        nrm = np.array([-d[1], d[0]]) / np.linalg.norm(d)
        dist = (u - p0[0]) * nrm[0] + (v - p0[1]) * nrm[1]
        return strength * np.exp(-((dist / width) ** 2))

    ar = h / w
    a = (
        sheen((0.80, 0.0), (1.02, 0.30 * ar * 2), 0.050, 0.075)
        + sheen((0.86, 0.0), (1.08, 0.30 * ar * 2), 0.0045, 0.11)
        + sheen((-0.02, 0.44 * ar * 2), (0.20, ar * 1.02), 0.060, 0.05)
    )
    edge = np.exp(-(np.minimum(u, 1 - u) / 0.035) ** 2) * 0.06
    a = a + edge
    # Keep the middle clean: the character and title read through untouched.
    clear = np.exp(-(((u - 0.5) / 0.36) ** 2 + ((yy / h - 0.5) / 0.55) ** 2))
    a = np.clip(a * (1 - 0.85 * clear), 0, 1)
    tintmix = np.clip(a * 6, 0, 1)[..., None]
    rgb = MINT * (1 - tintmix) + WHITE * tintmix
    save_webp(np.dstack([rgb, a]), "hero-foreground-glass.webp", quality=86)


# ----------------------------------------------------------------------- main

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("character")
    master, origin = build_character()
    Hm, Wm = master.shape[:2]
    W = round(Wm * CHARACTER_HEIGHT / Hm)
    ch = resize(master, W, CHARACTER_HEIGHT)
    save_webp(ch, "hero-character-main.webp", quality=90)
    m = character_metrics(ch)
    visor = build_visor_layers(ch, m)
    shadow, shadow_top, shadow_h = build_shadow(ch, m)
    save_webp(shadow, "hero-character-shadow.webp", quality=86)

    print("plate")
    plate_w, plate_h = build_plate()
    print("glass + light")
    obj1_ar, obj2_ar = build_hl_objects()
    build_halo()
    build_foreground_glass()

    H = CHARACTER_HEIGHT
    pct = lambda v, total: round(100 * v / total, 2)
    manifest = {
        "note": "Generated by scripts/hero/build_hero_assets.py. The character is matted from approved campaign art; it is never redrawn.",
        "sources": {
            "character": str(SRC_CHARACTER.relative_to(ROOT)).replace("\\", "/"),
            "character_crop_origin_px": [int(origin[0]), int(origin[1])],
            "plate": str(SRC_PLATE.relative_to(ROOT)).replace("\\", "/") + " (x>=1300, mirrored)",
            "hl_objects": str(SRC_MARK.relative_to(ROOT)).replace("\\", "/"),
        },
        "character": {"width": W, "height": H, "master": "assets/hero/hero-character-main.png"},
        "layout_percent_of_character_box": {
            "feet_line_y": pct(m["feet"] + 1, H),
            "head_top_y": pct(m["top"], H),
            "body_axis_x": pct(m["body_cx"], W),
            "visor": {
                "left": pct(visor["x0"], W),
                "top": pct(visor["y0"], H),
                "width": pct(visor["x1"] - visor["x0"], W),
                "height": pct(visor["y1"] - visor["y0"], H),
                "highlight_width_of_visor": round(visor["highlight_scale"], 3),
            },
            "shadow": {"top": round(100 * shadow_top, 2), "height": round(100 * shadow_h, 2)},
        },
        "plate": {"width": plate_w, "height": plate_h},
        "hl_object_aspect": {"object_1": round(obj1_ar, 4), "object_2": round(obj2_ar, 4)},
    }
    (MASTER / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps(manifest["layout_percent_of_character_box"], indent=2))


if __name__ == "__main__":
    main()
