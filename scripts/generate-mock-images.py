#!/usr/bin/env python3
"""Generate programmatic mock images (hero, galeri, cover artikel) via PIL.

Palette mengikuti design system site (globals.css):
  hijau #0f4c3a | hijau-tua #0a3327 | hijau-muda #1c6b51
  emas #c9a227 | emas-tua #8a6e12 | emas-muda #e8d48b
  krem #faf7f0 | krem-tua #f1eadb | coklat #3b3327

Semua gambar di-render 2x supersample lalu di-downscale LANCZOS.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "public" / "images"

HIJAU = (15, 76, 58)
HIJAU_TUA = (10, 51, 39)
HIJAU_MUDA = (28, 107, 81)
EMAS = (201, 162, 39)
EMAS_TUA = (138, 110, 18)
EMAS_MUDA = (232, 212, 139)
KREM = (250, 247, 240)
KREM_TUA = (241, 234, 219)
COKLAT = (59, 51, 39)

SS = 2  # supersample


# ---------------------------------------------------------------- utilities

def mix(c1, c2, t):
    return tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))


def vgrad(size, stops):
    """Vertical gradient. stops = [(pos0..1, color), ...] sorted by pos."""
    w, h = size
    img = Image.new("RGB", size)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                col = mix(c0, c1, (t - p0) / max(p1 - p0, 1e-6))
                break
        else:
            col = stops[-1][1]
        d.line([(0, y), (w, y)], fill=col)
    return img


def radial_glow(img, center, radius, color, peak_alpha=180):
    """Soft radial glow composited over img."""
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = center
    steps = 48
    for i in range(steps, 0, -1):
        r = radius * i / steps
        a = int(peak_alpha * (1 - i / steps) ** 2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius * 0.08))
    img.alpha_composite(overlay) if img.mode == "RGBA" else img.paste(
        Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    )
    return img


def add_grain(img, amount=6):
    w, h = img.size
    noise = Image.effect_noise((w, h), amount).convert("L")
    grain = Image.merge("RGB", (noise, noise, noise))
    return Image.blend(img, grain, 0.045)


def bez(p0, p1, p2, p3, n=48):
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def star_poly(cx, cy, outer, inner, points, rot=0.0):
    pts = []
    for i in range(points * 2):
        ang = rot + i * math.pi / points
        r = outer if i % 2 == 0 else inner
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def octagon(cx, cy, half):
    a = half / (1 + math.sqrt(2)) * math.sqrt(2)  # regular octagon from square
    pts = [
        (cx - half + a, cy - half), (cx + half - a, cy - half),
        (cx + half, cy - half + a), (cx + half, cy + half - a),
        (cx + half - a, cy + half), (cx - half + a, cy + half),
        (cx - half, cy + half - a), (cx - half, cy - half + a),
    ]
    return pts


# ---------------------------------------------------------------- shapes

def dome_points(cx, base_y, w, h, n=64):
    """Onion dome outline (right half mirrored)."""
    hw = w / 2
    right = bez(
        (cx + hw, base_y),
        (cx + hw, base_y - h * 0.62),
        (cx + hw * 0.34, base_y - h * 0.66),
        (cx, base_y - h),
        n,
    )
    left = [(2 * cx - x, y) for x, y in reversed(right[1:-1])]
    return right + left


def draw_dome(d, cx, base_y, w, h, fill, finial=True, finial_h=None):
    pts = dome_points(cx, base_y, w, h)
    d.polygon(pts, fill=fill)
    if finial:
        fh = finial_h if finial_h is not None else h * 0.22
        stem_w = max(w * 0.02, 2)
        d.rectangle([cx - stem_w, base_y - h - fh * 0.55, cx + stem_w, base_y - h], fill=fill)
        # crescent finial
        r = fh * 0.34
        cy = base_y - h - fh * 0.55 - r * 0.4
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
        off = r * 0.5
        d.ellipse([cx - r + off, cy - r - off * 0.15, cx + r + off, cy + r - off * 0.15],
                  fill=None, outline=None)
        return
    return


def draw_minaret(d, cx, base_y, w, h, fill):
    """Slim minaret with balcony and cone cap."""
    shaft_w = w * 0.34
    d.rectangle([cx - shaft_w / 2, base_y - h * 0.78, cx + shaft_w / 2, base_y], fill=fill)
    bal_y = base_y - h * 0.62
    bal_w = w * 0.62
    d.rectangle([cx - bal_w / 2, bal_y - h * 0.035, cx + bal_w / 2, bal_y], fill=fill)
    top_w = w * 0.4
    d.rectangle([cx - top_w / 2, base_y - h * 0.86, cx + top_w / 2, bal_y - h * 0.035], fill=fill)
    cone = [
        (cx - top_w / 2, base_y - h * 0.86),
        (cx + top_w / 2, base_y - h * 0.86),
        (cx, base_y - h),
    ]
    d.polygon(cone, fill=fill)
    r = w * 0.09
    d.ellipse([cx - r, base_y - h - r * 1.6, cx + r, base_y - h], fill=fill)


def draw_mosque(d, cx, ground_y, scale, fill, with_minarets=True):
    """Composite mosque silhouette. scale = overall width."""
    drum_w = scale * 0.5
    drum_h = scale * 0.22
    d.rectangle([cx - drum_w / 2, ground_y - drum_h, cx + drum_w / 2, ground_y], fill=fill)
    # steps / base
    d.rectangle([cx - scale * 0.34, ground_y, cx + scale * 0.34, ground_y + scale * 0.05], fill=fill)
    draw_dome(d, cx, ground_y - drum_h, scale * 0.46, scale * 0.34, fill)
    if with_minarets:
        draw_minaret(d, cx - scale * 0.42, ground_y, scale * 0.09, scale * 0.72, fill)
        draw_minaret(d, cx + scale * 0.42, ground_y, scale * 0.09, scale * 0.72, fill)


def pointed_arch_poly(x0, x1, ys, apex_y):
    """Pointed (lancet) arch outline: left spring -> apex -> right spring.

    Equilateral construction: radius r = 2*half-width, arc centers at opposite springs.
    Image coords: y grows downward, arcs bulge upward (negative y).
    """
    hw = (x1 - x0) / 2
    r = hw * 2
    steps = 40
    # left arc: center at right spring (x1, ys); from angle pi (left spring) up to apex
    a1 = math.pi + math.acos(max(-1.0, min(1.0, hw / r)))
    left_pts = []
    for i in range(steps + 1):
        a = math.pi + (a1 - math.pi) * i / steps
        left_pts.append((x1 + r * math.cos(a), ys + r * math.sin(a)))
    # right arc: center at left spring (x0, ys); from apex back down to angle 0 (right spring)
    a0 = -math.acos(max(-1.0, min(1.0, hw / r)))
    right_pts = []
    for i in range(steps + 1):
        a = a0 + (0.0 - a0) * i / steps
        right_pts.append((x0 + r * math.cos(a), ys + r * math.sin(a)))
    # if caller apex differs from equilateral apex, scale arc heights to match
    arch_apex = ys - r * math.sin(math.acos(hw / r))
    if abs(arch_apex - apex_y) > 1:
        k = (ys - apex_y) / max(ys - arch_apex, 1e-6)
        left_pts = [(p[0], ys - (ys - p[1]) * k) for p in left_pts]
        right_pts = [(p[0], ys - (ys - p[1]) * k) for p in right_pts]
    return left_pts + right_pts


# ---------------------------------------------------------------- patterns

def girih_field(d, size, cell, line_color, width, rot=math.pi / 8):
    """Classic 8-point star (khatam) lattice over the whole canvas."""
    w, h = size
    r = cell * 0.46
    for gy in range(-1, h // cell + 2):
        for gx in range(-1, w // cell + 2):
            cx = gx * cell + (cell / 2 if gy % 2 else 0)
            cy = gy * cell + cell / 2
            d.polygon(star_poly(cx, cy, r, r * 0.55, 8, rot), outline=line_color, width=width)
            d.polygon(star_poly(cx, cy, r * 0.34, r * 0.18, 8, rot + math.pi / 8),
                      outline=line_color, width=max(width - 1, 1))
    # connective grid lines
    for gx in range(0, w + cell, cell):
        d.line([(gx, 0), (gx, h)], fill=line_color, width=max(width - 1, 1))
    for gy in range(0, h + cell, cell):
        d.line([(0, gy), (w, gy)], fill=line_color, width=max(width - 1, 1))


def mashrabiya_field(d, size, cell, line_color, width):
    """Octagon stone-lattice (mashrabiya) tiling."""
    w, h = size
    for gy in range(-1, h // cell + 2):
        for gx in range(-1, w // cell + 2):
            cx, cy = gx * cell + cell / 2, gy * cell + cell / 2
            d.polygon(octagon(cx, cy, cell * 0.5), outline=line_color, width=width)
            d.polygon(octagon(cx, cy, cell * 0.3), outline=line_color, width=max(width - 1, 1))
            # bridging diamonds
            d.polygon(star_poly(cx, cy, cell * 0.16, cell * 0.07, 4, 0),
                      outline=line_color, width=max(width - 1, 1))


# ---------------------------------------------------------------- scenes

def scene_hero():
    """1920x1080: krem field, girih pattern, mosque silhouette di kanan-tengah.

    Dirancang agar tetap terbaca di bawah wash hijau 85% (kontras lumen tinggi).
    """
    w, h = 1920 * SS, 1080 * SS
    img = vgrad((w, h), [(0.0, KREM), (0.55, KREM_TUA), (1.0, mix(KREM_TUA, EMAS_MUDA, 0.5))])
    img = img.convert("RGBA")
    d = ImageDraw.Draw(img)

    # girih pattern layer (subtle)
    pat = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dp = ImageDraw.Draw(pat)
    girih_field(dp, (w, h), int(150 * SS), (*EMAS, 70), max(int(2.2 * SS), 2))
    img.alpha_composite(pat)

    ground = int(h * 0.86)
    # soft horizon band
    band = Image.new("RGBA", (w, int(h * 0.22)), (0, 0, 0, 0))
    db = ImageDraw.Draw(band)
    for i in range(int(h * 0.22)):
        a = int(90 * (i / (h * 0.22)))
        db.line([(0, i), (w, i)], fill=(*HIJAU_TUA, a))
    img.alpha_composite(band, (0, ground - int(h * 0.1)))

    # mosque silhouette (kanan-tengah agar tidak lawan teks kiri)
    d = ImageDraw.Draw(img)
    cx = int(w * 0.64)
    draw_mosque(d, cx, ground, int(w * 0.34), HIJAU_TUA)

    # decorative side minarets (jauh)
    draw_minaret(d, int(w * 0.12), ground, int(w * 0.035), int(h * 0.42), mix(HIJAU_TUA, KREM_TUA, 0.25))
    draw_minaret(d, int(w * 0.88), ground, int(w * 0.035), int(h * 0.38), mix(HIJAU_TUA, KREM_TUA, 0.25))

    # ground line
    d.rectangle([0, ground, w, ground + int(4 * SS)], fill=HIJAU_TUA)
    d.rectangle([0, ground + int(4 * SS), w, h], fill=mix(KREM_TUA, EMAS_MUDA, 0.35))

    img = img.convert("RGB").resize((1920, 1080), Image.LANCZOS)
    return add_grain(img)


def scene_g1_dome_dusk():
    """Dome siluet terhadap langit senja hangat."""
    w, h = 1200 * SS, 900 * SS
    img = vgrad((w, h), [
        (0.0, HIJAU_TUA), (0.35, HIJAU), (0.62, HIJAU_MUDA),
        (0.82, EMAS), (1.0, EMAS_MUDA),
    ]).convert("RGBA")
    img = radial_glow(img, (int(w * 0.5), int(h * 0.8)), int(h * 0.55), EMAS_MUDA, 150).convert("RGBA")
    d = ImageDraw.Draw(img)
    # stars
    random.seed(1)
    for _ in range(70):
        x, y = random.uniform(0, w), random.uniform(0, h * 0.45)
        r = random.uniform(1, 2.5) * SS
        d.ellipse([x - r, y - r, x + r, y + r], fill=(*KREM, random.randint(120, 220)))
    ground = int(h * 0.88)
    draw_mosque(d, int(w * 0.5), ground, int(w * 0.62), HIJAU_TUA)
    d.rectangle([0, ground + int(3 * SS), w, h], fill=HIJAU_TUA)
    img = img.convert("RGB").resize((1200, 900), Image.LANCZOS)
    return add_grain(img)


def scene_g2_girih():
    """Pola girih 8-fold penuh."""
    w, h = 1200 * SS, 900 * SS
    img = vgrad((w, h), [(0, HIJAU), (1, HIJAU_TUA)]).convert("RGBA")
    d = ImageDraw.Draw(img)
    girih_field(d, (w, h), int(112 * SS), (*EMAS, 255), max(int(3 * SS), 2))
    # center medallion highlight
    cx, cy = w // 2, h // 2
    for r, col in [(int(190 * SS), EMAS), (int(150 * SS), HIJAU_TUA), (int(118 * SS), EMAS)]:
        d.polygon(star_poly(cx, cy, r, r * 0.55, 8, math.pi / 8), outline=col, width=max(int(4 * SS), 2))
    img = img.convert("RGB").resize((1200, 900), Image.LANCZOS)
    return add_grain(img)


def scene_g3_arches():
    """Deret lengkung lancet berlapis (mihrab perspective)."""
    w, h = 1200 * SS, 900 * SS
    img = vgrad((w, h), [(0, HIJAU_TUA), (0.6, HIJAU), (1, mix(HIJAU, EMAS_TUA, 0.4))]).convert("RGBA")
    d = ImageDraw.Draw(img)
    layers = 5
    for i in range(layers):
        t = i / (layers - 1)
        inset = t * w * 0.09
        color = mix(HIJAU_TUA, EMAS_MUDA, t * 0.85)
        x0, x1 = inset, w - inset
        ys = h - t * h * 0.06
        apex = h * (0.28 + t * 0.1)
        poly = pointed_arch_poly(x0, x1, ys, apex)
        # fill the arch opening (inverted): draw frame as big rect minus arch -> simpler: draw arch outline thick + inner glow
        d.line(poly + [poly[0]], fill=color, width=max(int((8 - i * 1.2) * SS), 2))
    # glow behind smallest arch
    img = radial_glow(img.convert("RGB").convert("RGBA"), (w // 2, int(h * 0.55)), int(h * 0.3), EMAS_MUDA, 160)
    d = ImageDraw.Draw(img)
    # small dome inside innermost
    draw_dome(d, w // 2, int(h * 0.62), int(w * 0.16), int(h * 0.14), HIJAU_TUA)
    img = img.convert("RGB").resize((1200, 900), Image.LANCZOS)
    return add_grain(img)


def scene_g4_lanterns():
    """Lampu masjid (fanoos) bergantung."""
    w, h = 1200 * SS, 900 * SS
    img = vgrad((w, h), [(0, HIJAU_TUA), (1, HIJAU)]).convert("RGBA")
    d = ImageDraw.Draw(img)
    lanterns = [
        (0.18, 0.0, 0.52, 0.16), (0.5, 0.0, 0.34, 0.22), (0.82, 0.0, 0.6, 0.13),
        (0.34, 0.0, 0.7, 0.1), (0.66, 0.0, 0.78, 0.09),
    ]
    for fx, _, fy, fs in lanterns:
        cx = int(w * fx)
        top = int(h * fy)
        s = int(min(w, h) * fs * 0.42)
        # chain
        d.line([(cx, 0), (cx, top)], fill=EMAS_TUA, width=max(int(2.5 * SS), 1))
        # cap
        d.polygon([(cx - s * 0.35, top), (cx + s * 0.35, top),
                   (cx + s * 0.5, top + s * 0.22), (cx - s * 0.5, top + s * 0.22)], fill=EMAS)
        # body (hex)
        body = [
            (cx - s * 0.5, top + s * 0.22), (cx + s * 0.5, top + s * 0.22),
            (cx + s * 0.62, top + s * 0.7), (cx + s * 0.3, top + s * 1.15),
            (cx - s * 0.3, top + s * 1.15), (cx - s * 0.62, top + s * 0.7),
        ]
        d.polygon(body, fill=HIJAU)
        # inner light
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        dg = ImageDraw.Draw(glow)
        gr = s * 0.55
        dg.ellipse([cx - gr, top + s * 0.35, cx + gr, top + s * 1.05], fill=(*EMAS_MUDA, 120))
        glow = glow.filter(ImageFilter.GaussianBlur(s * 0.18))
        img.alpha_composite(glow)
        d = ImageDraw.Draw(img)
        # re-outline body over glow
        d.polygon(body, outline=EMAS, width=max(int(2.5 * SS), 1))
        # window bars
        for k in (-0.25, 0, 0.25):
            d.line([(cx + s * k, top + s * 0.28), (cx + s * k * 1.2, top + s * 1.08)],
                   fill=EMAS_TUA, width=max(int(2 * SS), 1))
        # finial
        d.polygon([(cx - s * 0.18, top + s * 1.15), (cx + s * 0.18, top + s * 1.15),
                   (cx, top + s * 1.42)], fill=EMAS)
    img = img.convert("RGB").resize((1200, 900), Image.LANCZOS)
    return add_grain(img)


def scene_g5_mashrabiya():
    """Lattice mashrabiya klasik."""
    w, h = 1200 * SS, 900 * SS
    img = vgrad((w, h), [(0, mix(HIJAU, EMAS_TUA, 0.25)), (1, HIJAU_TUA)]).convert("RGBA")
    d = ImageDraw.Draw(img)
    mashrabiya_field(d, (w, h), int(100 * SS), (*EMAS_MUDA, 255), max(int(2.6 * SS), 2))
    # warm light behind center
    img = radial_glow(img.convert("RGB").convert("RGBA"), (w // 2, h // 2), int(h * 0.42), EMAS, 110)
    img = img.convert("RGB").resize((1200, 900), Image.LANCZOS)
    return add_grain(img)


def scene_g6_rosette():
    """Medali 12-fold radial."""
    w, h = 1200 * SS, 900 * SS
    img = vgrad((w, h), [(0, KREM), (1, mix(KREM_TUA, EMAS_MUDA, 0.6))]).convert("RGBA")
    d = ImageDraw.Draw(img)
    cx, cy = w // 2, h // 2
    # petals
    for ring, (r, n, col) in enumerate([
        (330, 12, EMAS), (250, 12, HIJAU), (170, 12, EMAS_TUA), (95, 8, HIJAU),
    ]):
        rr = r * SS / 100 * 100  # r already in design px-ish
        R = int(r * SS / 1.0 * 0.8)
        for i in range(n):
            a = 2 * math.pi * i / n + ring * 0.13
            px, py = cx + R * 0.72 * math.cos(a), cy + R * 0.72 * math.sin(a)
            pw, ph = R * 0.36, R * 0.16
            ell = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            de = ImageDraw.Draw(ell)
            de.ellipse([px - pw, py - ph, px + pw, py + ph], fill=(*col, 255))
            ell = ell.rotate(math.degrees(a), center=(px, py))
            img.alpha_composite(ell)
        d = ImageDraw.Draw(img)
        d.ellipse([cx - R * 0.62, cy - R * 0.62, cx + R * 0.62, cy + R * 0.62],
                  outline=col, width=max(int(3 * SS), 2))
    d.ellipse([cx - 60 * SS, cy - 60 * SS, cx + 60 * SS, cy + 60 * SS], fill=HIJAU_TUA)
    d.polygon(star_poly(cx, cy, 44 * SS, 22 * SS, 8, math.pi / 8), fill=EMAS_MUDA)
    img = img.convert("RGB").resize((1200, 900), Image.LANCZOS)
    return add_grain(img)


def scene_g7_minaret_skyline():
    """Skyline menara senja."""
    w, h = 1200 * SS, 900 * SS
    img = vgrad((w, h), [
        (0.0, HIJAU_TUA), (0.45, HIJAU), (0.75, EMAS_TUA), (1.0, EMAS_MUDA),
    ]).convert("RGBA")
    img = radial_glow(img, (int(w * 0.3), int(h * 0.82)), int(h * 0.5), EMAS_MUDA, 170).convert("RGBA")
    d = ImageDraw.Draw(img)
    random.seed(7)
    # far layer
    for i, fx in enumerate([0.08, 0.22, 0.38, 0.55, 0.72, 0.9]):
        sc = random.uniform(0.1, 0.16) * w
        gh = int(h * 0.82 + (i % 3) * 8 * SS)
        draw_minaret(d, int(w * fx), gh, sc * 0.22, sc * 1.6, mix(HIJAU, EMAS_TUA, 0.35))
    # near layer
    ground = int(h * 0.9)
    draw_mosque(d, int(w * 0.5), ground, int(w * 0.55), HIJAU_TUA)
    draw_minaret(d, int(w * 0.16), ground, int(w * 0.05), int(h * 0.5), HIJAU_TUA)
    draw_minaret(d, int(w * 0.85), ground, int(w * 0.045), int(h * 0.44), HIJAU_TUA)
    d.rectangle([0, ground + int(3 * SS), w, h], fill=HIJAU_TUA)
    img = img.convert("RGB").resize((1200, 900), Image.LANCZOS)
    return add_grain(img)


def scene_g8_night_crescent():
    """Bulan sabit malam di atas kubah."""
    w, h = 1200 * SS, 900 * SS
    img = vgrad((w, h), [(0, (6, 30, 24)), (0.6, HIJAU_TUA), (1, HIJAU)]).convert("RGBA")
    random.seed(11)
    d = ImageDraw.Draw(img)
    for _ in range(140):
        x, y = random.uniform(0, w), random.uniform(0, h * 0.7)
        r = random.uniform(0.8, 2.6) * SS
        d.ellipse([x - r, y - r, x + r, y + r], fill=(*KREM, random.randint(90, 240)))
    # crescent
    cx, cy, r = int(w * 0.72), int(h * 0.24), int(70 * SS)
    img = radial_glow(img, (cx, cy), r * 3, EMAS_MUDA, 90).convert("RGBA")
    d = ImageDraw.Draw(img)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=EMAS_MUDA)
    off = int(r * 0.42)
    d.ellipse([cx - r + off, cy - r - off * 0.25, cx + r + off, cy + r - off * 0.25],
              fill=(6, 30, 24))
    ground = int(h * 0.9)
    draw_mosque(d, int(w * 0.42), ground, int(w * 0.5), (5, 22, 17))
    d.rectangle([0, ground + int(3 * SS), w, h], fill=(5, 22, 17))
    img = img.convert("RGB").resize((1200, 900), Image.LANCZOS)
    return add_grain(img)


def scene_berita_pengajian():
    """1280x720 cover: kolonade lengkung + cahaya hangat (pengajian)."""
    w, h = 1280 * SS, 720 * SS
    img = vgrad((w, h), [(0, HIJAU_TUA), (0.55, HIJAU), (1, mix(HIJAU, EMAS_TUA, 0.5))]).convert("RGBA")
    # light beams
    beams = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    db = ImageDraw.Draw(beams)
    for i, fx in enumerate([0.2, 0.5, 0.8]):
        bx = int(w * fx)
        db.polygon([
            (bx - int(w * 0.03), 0), (bx + int(w * 0.03), 0),
            (bx + int(w * 0.12), h), (bx - int(w * 0.12), h),
        ], fill=(*EMAS_MUDA, int(36 + i * 8)))
    beams = beams.filter(ImageFilter.GaussianBlur(w * 0.01))
    img.alpha_composite(beams)
    d = ImageDraw.Draw(img)
    ground = int(h * 0.84)
    # arcade of arches
    n = 5
    for i in range(n):
        aw = w / n
        x0, x1 = i * aw + aw * 0.15, (i + 1) * aw - aw * 0.15
        col = mix(HIJAU_TUA, EMAS, 0.25 + 0.1 * (i % 2))
        poly = pointed_arch_poly(x0, x1, ground, h * (0.3 + (0.06 if i % 2 else 0)))
        d.line(poly + [poly[0]], fill=col, width=max(int(10 * SS), 2))
        # inner glow arch fill suggestion
        inner = pointed_arch_poly(x0 + 14 * SS, x1 - 14 * SS, ground, h * (0.34 + (0.06 if i % 2 else 0)))
        d.line(inner + [inner[0]], fill=(*EMAS_MUDA, 255) if False else mix(HIJAU, EMAS_MUDA, 0.5),
               width=max(int(4 * SS), 1))
    # center dome accent
    draw_dome(d, w // 2, ground - int(h * 0.0), int(w * 0.18), int(h * 0.2), HIJAU_TUA)
    d.rectangle([0, ground, w, ground + int(5 * SS)], fill=HIJAU_TUA)
    d.rectangle([0, ground + int(5 * SS), w, h], fill=mix(HIJAU_TUA, (6, 30, 24), 0.5))
    img = img.convert("RGB").resize((1280, 720), Image.LANCZOS)
    return add_grain(img)


# ---------------------------------------------------------------- main

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("hero-masjid.jpg", scene_hero, 82),
        ("galeri-01.jpg", scene_g1_dome_dusk, 84),
        ("galeri-02.jpg", scene_g2_girih, 86),
        ("galeri-03.jpg", scene_g3_arches, 84),
        ("galeri-04.jpg", scene_g4_lanterns, 84),
        ("galeri-05.jpg", scene_g5_mashrabiya, 85),
        ("galeri-06.jpg", scene_g6_rosette, 85),
        ("galeri-07.jpg", scene_g7_minaret_skyline, 84),
        ("galeri-08.jpg", scene_g8_night_crescent, 84),
        ("berita-pengajian.jpg", scene_berita_pengajian, 84),
    ]
    for name, fn, quality in jobs:
        print(f"rendering {name} ...", flush=True)
        img = fn()
        path = OUT / name
        img.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
        kb = path.stat().st_size / 1024
        print(f"  -> {path}  {img.size[0]}x{img.size[1]}  {kb:.0f} KB")


if __name__ == "__main__":
    main()
