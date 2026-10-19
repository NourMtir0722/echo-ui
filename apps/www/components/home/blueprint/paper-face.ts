/**
 * The blueprint paper's two faces, painted once into pictures for the scroll
 * (ScrollPaper.tsx).
 *
 *   - The front: blueprint blue in the page's own seed, a little deeper toward
 *     the top left as the sheet catches the light, a fine grain, and the even
 *     grid of squares (16 across the drawing), glowing a little. The blue is
 *     held deep enough that the sheet's white words read at AA (4.6:1, with a
 *     margin) whatever seed the site wears.
 *   - The back: the same paper seen from behind, paler, the grid faint through
 *     it. It's what shows inside the rolls.
 *   - A legend, where one is asked for (the phone's list of the ways in): a
 *     block of the sheet with no grid in it, ruled round as a blueprint's
 *     title block is, so small chalk words are read on plain blue, not
 *     across the grid's glowing lines.
 */
import { hexToOklch, oklchToHex } from "@/components/home/echo3d/palette";

/** White text on the sheet has to read at least this well against its lightest blue. */
const NEED = 4.6;

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}
const onWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

/** The seed's hue as blueprint blue: a deep and a lighter shade, the lighter one as light as white text allows. */
export function blueprintBlues(accent: string): { deep: string; light: string; back: string } {
  const [, C, h] = hexToOklch(accent);
  const chroma = Math.min(0.2, Math.max(0.12, C));
  let L = 0.6;
  let light = oklchToHex([L, chroma, h]);
  while (onWhite(light) < NEED && L > 0.3) {
    L -= 0.01;
    light = oklchToHex([L, chroma, h]);
  }
  return {
    light,
    deep: oklchToHex([Math.max(0.25, L - 0.09), chroma * 1.05, h + 4]),
    // The back: the same blue paper from behind, lighter, as a roll's outside shows it.
    back: oklchToHex([0.74, chroma * 0.7, h]),
  };
}

/** A small tile of grain, for the paper's tooth. */
function grainTile(): HTMLCanvasElement {
  const t = document.createElement("canvas");
  t.width = t.height = 128;
  const g = t.getContext("2d")!;
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 14;
  }
  g.putImageData(img, 0, 0);
  return t;
}

function grid(g: CanvasRenderingContext2D, w: number, h: number, cell: number, alpha: number, line: number) {
  g.strokeStyle = `rgba(255,255,255,${alpha})`;
  g.lineWidth = line;
  g.beginPath();
  // Lines laid from the middle out, so the squares sit centred on the drawing as they did on the page.
  const x0 = (((w / 2 - cell / 2) % cell) + cell) % cell;
  const y0 = (((h / 2 - cell / 2) % cell) + cell) % cell;
  for (let x = x0; x <= w; x += cell) {
    g.moveTo(Math.round(x) + 0.5, 0);
    g.lineTo(Math.round(x) + 0.5, h);
  }
  for (let y = y0; y <= h; y += cell) {
    g.moveTo(0, Math.round(y) + 0.5);
    g.lineTo(w, Math.round(y) + 0.5);
  }
  g.stroke();
}

/** A box on the paper, CSS pixels from its top left. */
export interface PaperBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A rounded box's path. */
function box(g: CanvasRenderingContext2D, b: PaperBox, r: number) {
  g.beginPath();
  g.roundRect(b.x, b.y, b.w, b.h, r);
}

/**
 * Both faces at `width` by `height` CSS pixels, with squares `cell` pixels across, and a `legend` block
 * if one is asked for. Pictures are at most 4096 wide (a texture's safe limit), and sharp at the screen's
 * own density up to that.
 */
export function paperFaces({
  width,
  height,
  cell,
  accent,
  legend,
}: {
  width: number;
  height: number;
  cell: number;
  accent: string;
  legend?: PaperBox;
}): {
  front: string;
  back: string;
} {
  const k = Math.min(window.devicePixelRatio || 1, 2, 4096 / width);
  const W = Math.round(width * k);
  const H = Math.round(height * k);
  const blues = blueprintBlues(accent);
  const tooth = grainTile();

  const paint = (face: "front" | "back") => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    const fill = g.createLinearGradient(0, 0, W, H);
    fill.addColorStop(0, blues.deep);
    fill.addColorStop(1, blues.light);
    if (face === "front") {
      g.fillStyle = fill;
    } else {
      g.fillStyle = blues.back;
    }
    g.fillRect(0, 0, W, H);
    g.fillStyle = g.createPattern(tooth, "repeat")!;
    g.fillRect(0, 0, W, H);
    if (face === "front") {
      // The grid's glow, then the grid.
      g.save();
      g.filter = `blur(${2.5 * k}px)`;
      grid(g, W, H, cell * k, 0.28, 2 * k);
      g.restore();
      grid(g, W, H, cell * k, 0.34, 1.4 * k);
      if (legend) {
        const b = { x: legend.x * k, y: legend.y * k, w: legend.w * k, h: legend.h * k };
        // The sheet again inside it (its own blue at that place, its grain), so no line crosses the words.
        g.save();
        box(g, b, 6 * k);
        g.clip();
        g.fillStyle = fill;
        g.fillRect(0, 0, W, H);
        g.fillStyle = g.createPattern(tooth, "repeat")!;
        g.fillRect(0, 0, W, H);
        g.restore();
        // Ruled round, glowing a little as the grid does, and a fainter rule inside it.
        g.strokeStyle = "rgba(255,255,255,0.75)";
        g.save();
        g.filter = `blur(${2.5 * k}px)`;
        g.lineWidth = 2 * k;
        box(g, b, 6 * k);
        g.stroke();
        g.restore();
        g.lineWidth = 1.5 * k;
        box(g, b, 6 * k);
        g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.32)";
        g.lineWidth = 1 * k;
        box(g, { x: b.x + 4 * k, y: b.y + 4 * k, w: b.w - 8 * k, h: b.h - 8 * k }, 3 * k);
        g.stroke();
      }
    } else {
      grid(g, W, H, cell * k, 0.18, 1.2 * k);
    }
    return c.toDataURL("image/jpeg", 0.9);
  };
  return { front: paint("front"), back: paint("back") };
}
