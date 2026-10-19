"""
Echo in three dimensions, modelled in Blender from the canonical drawing.

Run it from the repository root (Blender 4.2 or later):

    /Applications/Blender.app/Contents/MacOS/Blender --background \
        --python apps/www/scripts/echo-3d/model.py -- apps/www/public/models/echo.glb [echo.blend]

It reads the body from the registry's character.ts, the one drawing of
Echo, so the 3D silhouette is the silhouette everywhere else: all eight
petals, none moved.

The body is the outline inflated like a balloon. A Poisson solve over the
outline (the Laplacian of u is -1 inside, u is 0 on the edge) gives a smooth
hill, and the height is the square root of u: a disc comes out as a perfect
ellipsoid, the petals as round lobes, and the edge meets itself front to back
with no crease. (A plain distance field draws a ridge from the middle out to
every petal.) The front is fuller than the back, so it sits like a plush toy.

The face isn't modelled: the page prints the drawing's own eyes onto the
front (echo3d/material.ts), so they sit flush and move as paint. For that it
needs to know where the drawing lands on the model, which the body carries
as extras: `svg_centre`, the drawing point at the model's origin, and
`svg_scale`, model units per drawing unit.

In glTF units the flower is 2 tall (y from -1 to 1 about its centre), faces
+z, and its lowest petal touches y = -1. Materials are the page's; none here.
"""

import math
import re
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils.geometry import delaunay_2d_cdt

ROOT = Path(__file__).resolve().parents[4]
CHARACTER = ROOT / "registry/src/echo/creature/character.ts"

# How full the body is, front and back, as a fraction of its half-height.
FRONT = 0.62
BACK = 0.5


# --- The drawing -----------------------------------------------------------

def read_character():
    src = CHARACTER.read_text()
    return dict(re.findall(r'export const (ECHO_\w+) =\s*"([^"]+)"', src))


TOKEN = re.compile(r"[MmLlHhVvCcSsQqZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


def path_points(d, step=0.08):
    """An SVG path as closed polylines, curves sampled every `step` units."""
    toks = TOKEN.findall(d)
    i, cmd = 0, None
    x = y = sx = sy = 0.0
    last_ctrl = None
    subpaths, pts = [], []

    def num():
        nonlocal i
        v = float(toks[i])
        i += 1
        return v

    def cubic(p0, p1, p2, p3):
        chord = math.dist(p0, p1) + math.dist(p1, p2) + math.dist(p2, p3)
        n = max(4, math.ceil(chord / step))
        for k in range(1, n + 1):
            t = k / n
            a = (1 - t) ** 3
            b = 3 * (1 - t) ** 2 * t
            c = 3 * (1 - t) * t * t
            e = t ** 3
            pts.append((a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]))

    while i < len(toks):
        t = toks[i]
        if t.isalpha():
            cmd = t
            i += 1
            if cmd in "Zz":
                if pts:
                    subpaths.append(pts)
                pts = []
                x, y = sx, sy
                continue
        rel = cmd.islower()
        c = cmd.upper()
        ox, oy = (x, y) if rel else (0.0, 0.0)
        if c == "M":
            if pts:
                subpaths.append(pts)
            x, y = num() + ox, num() + oy
            sx, sy = x, y
            pts = [(x, y)]
            cmd = "l" if rel else "L"
            last_ctrl = None
        elif c == "L":
            x, y = num() + ox, num() + oy
            pts.append((x, y))
            last_ctrl = None
        elif c == "H":
            x = num() + ox
            pts.append((x, y))
            last_ctrl = None
        elif c == "V":
            y = num() + oy
            pts.append((x, y))
            last_ctrl = None
        elif c == "C":
            p1 = (num() + ox, num() + oy)
            p2 = (num() + ox, num() + oy)
            p3 = (num() + ox, num() + oy)
            cubic((x, y), p1, p2, p3)
            last_ctrl = p2
            x, y = p3
        elif c == "S":
            p1 = (2 * x - last_ctrl[0], 2 * y - last_ctrl[1]) if last_ctrl else (x, y)
            p2 = (num() + ox, num() + oy)
            p3 = (num() + ox, num() + oy)
            cubic((x, y), p1, p2, p3)
            last_ctrl = p2
            x, y = p3
        else:
            raise ValueError(f"path command {cmd} is not used by the drawing")
    if pts:
        subpaths.append(pts)
    return subpaths


def resample(poly, spacing):
    """A closed polyline with evenly spaced points, counter-clockwise, first point not repeated."""
    p = np.asarray(poly, dtype=float)
    if np.allclose(p[0], p[-1]):
        p = p[:-1]
    loop = np.vstack([p, p[:1]])
    seg = np.linalg.norm(np.diff(loop, axis=0), axis=1)
    keep = seg > 1e-9
    loop = np.vstack([loop[:-1][keep], loop[:1]])
    seg = seg[keep]
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(8, int(round(s[-1] / spacing)))
    at = np.linspace(0, s[-1], n, endpoint=False)
    out = np.column_stack([np.interp(at, s, loop[:, 0]), np.interp(at, s, loop[:, 1])])
    area = 0.5 * np.sum(out[:, 0] * np.roll(out[:, 1], -1) - np.roll(out[:, 0], -1) * out[:, 1])
    return out if area > 0 else out[::-1]


# --- Geometry helpers --------------------------------------------------------

def inside(poly, pts):
    """Even-odd point-in-polygon for many points at once."""
    px, py = pts[:, 0], pts[:, 1]
    res = np.zeros(len(pts), dtype=bool)
    x0, y0 = poly[:, 0], poly[:, 1]
    x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
    for a, b, c, d in zip(x0, y0, x1, y1):
        if b == d:
            continue
        cross = (b > py) != (d > py)
        xs = (c - a) * (py - b) / (d - b) + a
        res ^= cross & (px < xs)
    return res


def edge_distance(poly, pts):
    """Distance from each point to the closed polyline."""
    a = poly
    b = np.roll(poly, -1, axis=0)
    best = np.full(len(pts), np.inf)
    for chunk in range(0, len(a), 256):
        aa = a[chunk : chunk + 256][None]
        ab = (b[chunk : chunk + 256] - a[chunk : chunk + 256])[None]
        ap = pts[:, None, :] - aa
        t = np.clip((ap * ab).sum(-1) / np.maximum((ab * ab).sum(-1), 1e-12), 0, 1)
        d = np.linalg.norm(ap - t[..., None] * ab, axis=-1).min(axis=1)
        best = np.minimum(best, d)
    return best


class Inflation:
    """sqrt(u) over a grid, where the Laplacian of u is -1 inside `poly` and u is 0 outside."""

    def __init__(self, poly, cells=320, pad=0.04):
        lo = poly.min(axis=0) - pad
        hi = poly.max(axis=0) + pad
        self.h = float(max(hi - lo)) / (cells - 1)
        self.lo = lo
        nx = int(math.ceil((hi[0] - lo[0]) / self.h)) + 1
        ny = int(math.ceil((hi[1] - lo[1]) / self.h)) + 1
        gx = lo[0] + np.arange(nx) * self.h
        gy = lo[1] + np.arange(ny) * self.h
        X, Y = np.meshgrid(gx, gy)
        mask = inside(poly, np.column_stack([X.ravel(), Y.ravel()])).reshape(X.shape)
        self.u = self._solve(mask)
        self.peak = float(self.u.max())

    def _solve(self, mask):
        # Conjugate gradients on the 5-point Laplacian, matrix-free.
        h2 = self.h * self.h
        m = mask.astype(float)

        def A(v):
            v = v * m
            p = np.pad(v, 1)
            lap = p[1:-1, 2:] + p[1:-1, :-2] + p[2:, 1:-1] + p[:-2, 1:-1] - 4 * v
            return -lap * m

        b = h2 * m
        u = np.zeros_like(b)
        r = b - A(u)
        p = r.copy()
        rs = (r * r).sum()
        for _ in range(4000):
            Ap = A(p)
            alpha = rs / (p * Ap).sum()
            u += alpha * p
            r -= alpha * Ap
            rn = (r * r).sum()
            if math.sqrt(rn) < 1e-10:
                break
            p = r + (rn / rs) * p
            rs = rn
        return u * m

    def height(self, pts):
        """0 on the outline, 1 at the fullest point; bilinear between grid points."""
        f = (pts - self.lo) / self.h
        i = np.clip(np.floor(f).astype(int), 0, np.array(self.u.shape[::-1]) - 2)
        t = np.clip(f - i, 0, 1)
        u = self.u
        ix, iy = i[:, 0], i[:, 1]
        tx, ty = t[:, 0], t[:, 1]
        v = (
            u[iy, ix] * (1 - tx) * (1 - ty)
            + u[iy, ix + 1] * tx * (1 - ty)
            + u[iy + 1, ix] * (1 - tx) * ty
            + u[iy + 1, ix + 1] * tx * ty
        )
        return np.sqrt(np.clip(v / self.peak, 0, 1))


def fill(poly, spacing, rings):
    """Triangulate inside `poly`: the outline, a few rings hugging it, then an even grid."""
    n = len(poly)
    pts = [poly]
    nrm = np.roll(poly, -1, axis=0) - np.roll(poly, 1, axis=0)
    nrm = np.column_stack([-nrm[:, 1], nrm[:, 0]])  # inward for a CCW outline
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    for d in rings:
        ring = poly + nrm * d
        ok = inside(poly, ring) & (edge_distance(poly, ring) > 0.8 * d)
        ring = ring[ok]
        # Rings are sampled as finely as the outline only where they need to be.
        pts.append(ring[:: max(1, int(round(1 + d / (2 * spacing))))])
    lo, hi = poly.min(axis=0), poly.max(axis=0)
    gx = np.arange(lo[0], hi[0], spacing)
    gy = np.arange(lo[1], hi[1], spacing * math.sqrt(3) / 2)
    grid = np.array([(x + (spacing / 2 if j % 2 else 0), y) for j, y in enumerate(gy) for x in gx])
    grid = grid[inside(poly, grid)]
    grid = grid[edge_distance(poly, grid) > (rings[-1] if rings else 0) + spacing * 0.6]
    pts.append(grid)
    allp = np.vstack(pts)

    verts, _, faces, *_ = delaunay_2d_cdt(
        [tuple(p) for p in allp], [(k, (k + 1) % n) for k in range(n)], [], 0, 1e-7
    )
    verts = np.array([(v.x, v.y) for v in verts])
    tris = []
    for f in faces:
        c = verts[list(f)].mean(axis=0)
        if inside(poly, c[None])[0]:
            tris.append(tuple(f))
    return verts, tris


def boundary_loop(tris):
    """The ordered vertex loop along the open edge of a triangle fan-out."""
    count = {}
    for t in tris:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            key = (min(a, b), max(a, b))
            count[key] = count.get(key, 0) + 1
    nxt = {}
    for t in tris:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            if count[(min(a, b), max(a, b))] == 1:
                nxt[a] = b
    start = next(iter(nxt))
    loop, v = [start], nxt[start]
    while v != start:
        loop.append(v)
        v = nxt[v]
    return loop


# --- Blender -----------------------------------------------------------------

def to_blender(x, y, z):
    """Modelled upright facing -Y in Blender, which exports as facing +z, y up."""
    return (x, -z, y)


def make_object(name, verts3, faces):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([to_blender(x, y, z) for x, y, z in verts3], [], faces)
    mesh.validate()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = True
    return obj


def solid(verts2, tris, front, back):
    """A closed shell: `front` and `back` heights over one triangulation, sharing the outline."""
    on_edge = set(boundary_loop(tris))
    verts = [(x, y, front[k]) for k, (x, y) in enumerate(verts2)]
    back_index = {}
    for k, (x, y) in enumerate(verts2):
        if k in on_edge:
            back_index[k] = k
        else:
            back_index[k] = len(verts)
            verts.append((x, y, back[k]))
    faces = [tuple(t) for t in tris]
    faces += [(back_index[c], back_index[b], back_index[a]) for a, b, c in tris]
    return verts, faces


def apply(obj, kind, **settings):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mod = obj.modifiers.new(kind.lower(), kind)
    for k, v in settings.items():
        setattr(mod, k, v)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)


def reduce(obj, faces):
    """Collapse to about `faces` triangles; the collapse keeps them where the surface bends."""
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris > faces:
        apply(obj, "DECIMATE", ratio=faces / tris)
    apply(obj, "TRIANGULATE")


def even_out(obj, voxel, faces):
    """Remesh evenly, relax the voxel steps away, then reduce."""
    apply(obj, "REMESH", mode="VOXEL", voxel_size=voxel, use_smooth_shade=True)
    apply(obj, "CORRECTIVE_SMOOTH", iterations=6, use_only_smooth=True)
    reduce(obj, faces)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    out = Path(argv[0]) if argv else ROOT / "apps/www/public/models/echo.glb"
    blend = Path(argv[1]) if len(argv) > 1 else None

    bpy.ops.wm.read_factory_settings(use_empty=True)
    shapes = read_character()

    body_svg = path_points(shapes["ECHO_BODY"])[0]
    lo = np.min(body_svg, axis=0)
    hi = np.max(body_svg, axis=0)
    centre = (lo + hi) / 2
    scale = 2.0 / (hi[1] - lo[1])

    def norm(poly):
        p = (np.asarray(poly) - centre) * scale
        p[:, 1] *= -1
        return p

    outline = resample(norm(body_svg), 0.018)
    body_lift = Inflation(outline)
    verts2, tris = fill(outline, 0.03, [0.004, 0.012, 0.024, 0.042, 0.066, 0.1])
    t = body_lift.height(verts2)
    verts3, faces = solid(verts2, tris, FRONT * t, -BACK * t)
    body = make_object("Body", verts3, faces)
    even_out(body, 0.009, 7000)
    # Where the drawing lands on the model, for the page to print the face.
    body["svg_centre"] = [float(centre[0]), float(centre[1])]
    body["svg_scale"] = float(scale)

    out.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_normals=True,
        export_texcoords=False,
        export_materials="NONE",
        export_extras=True,
    )
    if blend:
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))

    print(f"Body: {len(body.data.vertices)} verts, {len(body.data.polygons)} faces; wrote {out}")


main()
