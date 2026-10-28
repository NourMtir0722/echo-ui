/**
 * Echo painted on a canvas, from its own SVG.
 *
 * The SVG stays in the page: it's what a visitor sees before the script runs,
 * the rig (./rig) goes on moving its groups, and the page's CSS goes on
 * styling its parts (the seed's --brand-* colours; a drawn look's paper and
 * ink line). Once the canvas has painted, the SVG is hidden, and on every frame
 * the rig moves it the canvas paints the same parts under the same transforms,
 * in the colours and lines the CSS gives them, read from the hidden SVG
 * whenever the page relights.
 *
 * A canvas because a moved SVG group makes the browser rebuild the whole
 * page's layers, every frame Echo breathes; a canvas painted every frame
 * costs the page no rebuild, no paint and no layout.
 *
 * It paints what the creature is made of and no more: paths, ellipses and
 * circles under nested groups, filled with a colour or a radial gradient
 * whose stops carry their alpha in their colour, and stroked with an opacity,
 * a join and, where the CSS asks for it, a width that doesn't scale.
 */

interface Look {
  fill: string | CanvasGradient | null;
  /** The gradient is laid on the part's bounding box (objectBoundingBox). */
  onBox: boolean;
  stroke: string | null;
  width: number;
  opacity: number;
  join: CanvasLineJoin;
  /** vector-effect: non-scaling-stroke: the width is in CSS px, whatever the transforms. */
  fixed: boolean;
}

/** An affine transform, as SVG and the canvas write one: [a, b, c, d, e, f]. Plain numbers: a DOMMatrix per step cost more than the painting. */
type Affine = readonly [number, number, number, number, number, number];

const multiply = (m: Affine, n: Affine): Affine => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

interface Part {
  el: SVGGraphicsElement;
  outline: Path2D;
  /** The outline in units of its bounding box, and the box, for a gradient laid on it. */
  inBox: Path2D | null;
  box: Affine | null;
  /** Its own transform attribute, which nothing moves. */
  own: Affine;
  /** The groups it sits in, outermost first. */
  groups: SVGGElement[];
  look: Look | null;
}

export interface CreatureCanvas {
  /** Paints the creature where the rig has put it, if it has moved since the last paint (or `force`). */
  paint(force?: boolean): void;
  /** The page relit: read every part's colours and lines again, and paint. */
  relight(): void;
}

/** A transform attribute as a matrix, read from the SVG's own parse of it. */
function matrixOf(el: SVGGraphicsElement): Affine {
  const list = el.transform.baseVal;
  let m: Affine = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < list.numberOfItems; i++) {
    const t = list.getItem(i).matrix;
    m = multiply(m, [t.a, t.b, t.c, t.d, t.e, t.f]);
  }
  return m;
}

function outlineOf(el: Element): Path2D | null {
  const n = (name: string) => parseFloat(el.getAttribute(name) ?? "0");
  switch (el.tagName.toLowerCase()) {
    case "path":
      return new Path2D(el.getAttribute("d") ?? "");
    case "ellipse": {
      const p = new Path2D();
      p.ellipse(n("cx"), n("cy"), n("rx"), n("ry"), 0, 0, Math.PI * 2);
      return p;
    }
    case "circle": {
      const p = new Path2D();
      p.arc(n("cx"), n("cy"), n("r"), 0, Math.PI * 2);
      return p;
    }
    default:
      return null;
  }
}

/** A gradient attribute as a fraction: "38%" or "0.38". */
const fraction = (v: string | null, otherwise: number) =>
  v === null ? otherwise : v.trim().endsWith("%") ? parseFloat(v) / 100 : parseFloat(v);

/**
 * Paints `svg` onto `canvas`, which lies over the SVG's `size`-px box and
 * reaches `reach` px past it on every side. Null where there's no 2D canvas:
 * the SVG stays, and the rig moves it as it always did.
 */
export function creatureCanvas(canvas: HTMLCanvasElement, svg: SVGSVGElement, size: number, reach: number): CreatureCanvas | null {
  const g = canvas.getContext("2d");
  if (!g) return null;

  const parts: Part[] = [];
  for (const el of svg.querySelectorAll<SVGGraphicsElement>("path, ellipse, circle")) {
    if (el.closest("defs")) continue;
    const outline = outlineOf(el);
    if (!outline) continue;
    const groups: SVGGElement[] = [];
    for (let p: Element | null = el.parentElement; p && p !== svg; p = p.parentElement) if (p instanceof SVGGElement) groups.unshift(p);
    parts.push({ el, outline, inBox: null, box: null, own: matrixOf(el), groups, look: null });
  }
  const moving = [...new Set(parts.flatMap((p) => p.groups))];

  // The viewBox into the box's CSS px, centred the way preserveAspectRatio's default (xMidYMid meet) does.
  const vb = svg.viewBox.baseVal;
  const unit = Math.min(size / vb.width, size / vb.height);
  const toBox: Affine = [unit, 0, 0, unit, (size - vb.width * unit) / 2 - vb.x * unit, (size - vb.height * unit) / 2 - vb.y * unit];

  /**
   * A part's bounding box, for a gradient laid on it: measured the first time
   * one is, with the SVG drawn for that moment (a hidden one measures nothing).
   * False where it can't be: the creature isn't on the page.
   */
  const measure = (p: Part) => {
    const hidden = svg.style.display === "none";
    if (hidden) svg.style.display = "";
    let b: DOMRect | null = null;
    try {
      b = p.el.getBBox();
    } catch {
      // Not drawn (Firefox throws for that).
    }
    if (hidden) svg.style.display = "none";
    if (!b || !(b.width > 0 && b.height > 0)) return false;
    p.box = [b.width, 0, 0, b.height, b.x, b.y];
    p.inBox = new Path2D();
    p.inBox.addPath(p.outline, new DOMMatrix([1 / b.width, 0, 0, 1 / b.height, -b.x / b.width, -b.y / b.height]));
    return true;
  };

  /** A part's look, as the page's CSS has it now. */
  const read = (el: SVGGraphicsElement): Look | null => {
    const css = getComputedStyle(el);
    if (css.getPropertyValue("display") === "none") return null;
    const fill = css.getPropertyValue("fill");
    let paint: string | CanvasGradient | null = fill === "none" ? null : fill;
    let onBox = false;
    const ref = /url\(["']?[^#"')]*#([^"')]+)/.exec(fill)?.[1];
    if (ref) {
      paint = null;
      const grad = svg.getElementById(ref);
      if (grad?.tagName.toLowerCase() === "radialgradient") {
        const at = (name: string, otherwise: number) => fraction(grad.getAttribute(name), otherwise);
        const cx = at("cx", 0.5);
        const cy = at("cy", 0.5);
        const made = g.createRadialGradient(at("fx", cx), at("fy", cy), 0, cx, cy, at("r", 0.5));
        try {
          for (const stop of grad.querySelectorAll("stop")) {
            made.addColorStop(Math.min(1, Math.max(0, fraction(stop.getAttribute("offset"), 0))), getComputedStyle(stop).getPropertyValue("stop-color"));
          }
          paint = made;
          onBox = grad.getAttribute("gradientUnits") !== "userSpaceOnUse";
        } catch {
          // A colour the canvas can't read: the part goes unfilled rather than wrong.
        }
      }
    }
    const stroke = css.getPropertyValue("stroke");
    const width = parseFloat(css.getPropertyValue("stroke-width"));
    return {
      fill: paint,
      onBox,
      stroke: stroke === "none" || !(width > 0) ? null : stroke,
      width,
      opacity: parseFloat(css.getPropertyValue("stroke-opacity") || "1"),
      join: (css.getPropertyValue("stroke-linejoin") || "miter") as CanvasLineJoin,
      fixed: css.getPropertyValue("vector-effect") === "non-scaling-stroke",
    };
  };

  let lit = false;
  const light = () => {
    lit = true;
    for (const p of parts) p.look = read(p.el);
  };
  let last = "";
  let shown = false;
  const painter: CreatureCanvas = {
    paint(force = false) {
      const where = moving.map((m) => m.getAttribute("transform") ?? "").join("|");
      const across = size + reach * 2;
      const pixels = Math.round(across * (window.devicePixelRatio || 1));
      const resized = canvas.width !== pixels;
      if (!force && !resized && where === last) return;
      if (!lit) light();
      for (const p of parts) if (p.look?.onBox && !p.box && !measure(p)) return;
      last = where;
      if (resized) canvas.width = canvas.height = pixels;

      // The box's CSS px into the canvas's pixels, the canvas reaching `reach` past the box.
      const k = pixels / across;
      const toCanvas: Affine = [k, 0, 0, k, reach * k, reach * k];
      const set = (m: Affine) => g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      // SVG's default; the canvas's is 10.
      g.miterLimit = 4;
      const at = new Map<SVGGElement, Affine>();
      for (const p of parts) {
        const look = p.look;
        if (!look) continue;
        let local = toBox;
        for (const group of p.groups) {
          let m = at.get(group);
          if (!m) at.set(group, (m = matrixOf(group)));
          local = multiply(local, m);
        }
        local = multiply(local, p.own);
        const full = multiply(toCanvas, local);
        if (look.fill) {
          g.fillStyle = look.fill;
          if (look.onBox && p.box && p.inBox) {
            set(multiply(full, p.box));
            g.fill(p.inBox);
          } else {
            set(full);
            g.fill(p.outline);
          }
        }
        if (look.stroke) {
          g.strokeStyle = look.stroke;
          g.lineWidth = look.width;
          g.lineJoin = look.join;
          g.globalAlpha = look.opacity;
          if (look.fixed) {
            // The outline carried into CSS px, and stroked there: the same width at any scale, as SVG draws it.
            const carried = new Path2D();
            carried.addPath(p.outline, new DOMMatrix([...local]));
            set(toCanvas);
            g.stroke(carried);
          } else {
            set(full);
            g.stroke(p.outline);
          }
          g.globalAlpha = 1;
        }
      }
      // Painted: the SVG has nothing left to show.
      if (!shown) svg.style.display = "none";
      shown = true;
    },
    relight() {
      // Not painted yet: the first paint reads them.
      if (!lit) return;
      light();
      painter.paint(true);
    },
  };
  return painter;
}
