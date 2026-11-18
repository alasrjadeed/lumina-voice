#!/usr/bin/env python3
# Generates install icons for Lumina Voice without any image library.
# Pure-Python RGBA PNG writer (zlib + struct) that rasterises the brand mark
# from favicon.svg: dark rounded square, gold ring, gold chevron, violet smile.
import struct
import zlib
from pathlib import Path

OUT = Path("/workspace/public")
OUT.mkdir(parents=True, exist_ok=True)

BG = (8, 7, 11)
GOLD = (228, 195, 106)
VIOLET = (139, 124, 246)

# Geometry is authored on a 64x64 grid and scaled to the requested size.
SCALE = 64


def inside_round_rect(x, y, w, h, r, pad=0):
    x0, y0 = pad, pad
    x1, y1 = w - pad, h - pad
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r


def inside_ring(x, y, cx, cy, R, t):
    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    return abs(d - R) <= t / 2


def inside_segment(x, y, x0, y0, x1, y1, t):
    vx, vy = x1 - x0, y1 - y0
    wx, wy = x - x0, y - y0
    seg2 = vx * vx + vy * vy
    u = 0.0 if seg2 == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / seg2))
    px, py = x0 + u * vx, y0 + u * vy
    return ((x - px) ** 2 + (y - py) ** 2) ** 0.5 <= t / 2


def inside_lower_arc(x, y, cx, cy, R, t):
    if y < cy:
        return False
    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    return abs(d - R) <= t / 2


def mark_colors(x, y):
    """Returns an RGBA tuple for a point in 64-space, or None for transparent."""
    if inside_ring(x, y, 32, 32, 18, 2):
        return GOLD + (255,)
    if inside_segment(x, y, 32, 18, 32, 30, 2.4):
        return GOLD + (255,)
    if inside_segment(x, y, 26, 26, 32, 30, 2.4) or inside_segment(x, y, 32, 30, 38, 26, 2.4):
        return GOLD + (255,)
    if inside_lower_arc(x, y, 32, 38, 10, 2.2):
        return VIOLET + (255,)
    return None


def render(size, pad_ratio=0.0):
    """Rasterise the mark by supersampling. Kept small (<=192) so Python stays fast."""
    ss = 3  # supersampling factor
    rows = []
    total = ss * ss
    for py in range(size):
        row = bytearray()
        for px in range(size):
            bg_hits = 0
            fr = fg = fb = fa = 0
            for sy in range(ss):
                for sx in range(ss):
                    fx = (px + (sx + 0.5) / ss) / size
                    fy = (py + (sy + 0.5) / ss) / size
                    gx = (fx * (1 - 2 * pad_ratio) + pad_ratio) * SCALE
                    gy = (fy * (1 - 2 * pad_ratio) + pad_ratio) * SCALE
                    if inside_round_rect(gx, gy, SCALE, SCALE, 16, pad=0.5):
                        bg_hits += 1
                    col = mark_colors(gx, gy)
                    if col:
                        fr += col[0]
                        fg += col[1]
                        fb += col[2]
                        fa += col[3]
            a = bg_hits / total
            if a <= 0:
                row += bytes([0, 0, 0, 0])
                continue
            r0, g0, b0 = BG
            if fa > 0:
                n = fa / 255
                cov = min(1.0, fa / total)
                r0 = int(r0 * (1 - cov) + (fr / n) * cov)
                g0 = int(g0 * (1 - cov) + (fg / n) * cov)
                b0 = int(b0 * (1 - cov) + (fb / n) * cov)
            row += bytes([r0, g0, b0, int(a * 255)])
        rows.append(bytes(row))
    return rows


def upscale(rows, size, factor):
    """Bilinear upscale of an RGBA row buffer by an integer factor."""
    out = []
    for py in range(size * factor):
        sy = (py + 0.5) / factor - 0.5
        y0 = max(0, min(size - 1, int(sy)))
        y1 = min(size - 1, y0 + 1)
        wy = min(1.0, max(0.0, sy - y0))
        row = bytearray()
        for px in range(size * factor):
            sx = (px + 0.5) / factor - 0.5
            x0 = max(0, min(size - 1, int(sx)))
            x1 = min(size - 1, x0 + 1)
            wx = min(1.0, max(0.0, sx - x0))
            px_out = []
            for c in range(4):
                v00 = rows[y0][x0 * 4 + c]
                v10 = rows[y0][x1 * 4 + c]
                v01 = rows[y1][x0 * 4 + c]
                v11 = rows[y1][x1 * 4 + c]
                top = v00 + (v10 - v00) * wx
                bot = v01 + (v11 - v01) * wx
                px_out.append(int(top + (bot - top) * wy + 0.5))
            row += bytes(px_out)
        out.append(bytes(row))
    return out


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)
    print(f"{path.name}: {size}x{size} {len(png)} B")


def main():
    base = render(192)
    write_png(OUT / "icon-192.png", 192, base)
    write_png(OUT / "apple-touch-icon.png", 180, upscale(render(90), 90, 2))
    write_png(OUT / "icon-512.png", 512, upscale(render(128), 128, 4))
    write_png(OUT / "icon-maskable-512.png", 512, upscale(render(128, pad_ratio=0.14), 128, 4))


if __name__ == "__main__":
    main()
