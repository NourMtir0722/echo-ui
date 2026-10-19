/**
 * `style sample`: the visual evidence for a style read from a moodboard,
 * with no Python. Given one reference image, into an assets folder:
 *
 *   reference.png      the plate itself (a width-capped copy)
 *   values.png         a strip of the dominant values, dark to light
 *   crop-<name>.png    magnified details of the surfaces a claim rests on
 *
 * and the sampled hex values with their share of the pixels, so a style
 * quotes real numbers instead of guessed ones. Design Eye's own script did
 * this with Pillow's median cut, which can blend two colours into one that's
 * in neither; this cuts between colours instead, on a 400px copy, and zooms
 * with nearest neighbour so grain and strokes stay honest.
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

export interface Raster {
  width: number;
  height: number;
  /** RGBA, 4 bytes a pixel. */
  data: Uint8Array;
}

export interface Swatch {
  hex: string;
  /** 0 to 1. */
  share: number;
}

const hex2 = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** A PNG or JPEG, decoded. Anything else is refused by name. */
export function decode(bytes: Uint8Array, name: string): Raster {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  if (isPng) {
    const png = PNG.sync.read(Buffer.from(bytes));
    return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
  }
  if (isJpeg) {
    const image = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
    return { width: image.width, height: image.height, data: image.data };
  }
  throw new Error(`${name} isn't a PNG or a JPEG. Save it as one (a screenshot tool or Preview can) and sample that.`);
}

export function encode(raster: Raster): Buffer {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  return PNG.sync.write(png);
}

/** A smaller copy, each pixel the average of the ones it covers. No-op when it already fits. */
export function shrink(raster: Raster, maxWidth: number, maxHeight = maxWidth): Raster {
  const scale = Math.min(1, maxWidth / raster.width, maxHeight / raster.height);
  if (scale === 1) return raster;
  const width = Math.max(1, Math.round(raster.width * scale));
  const height = Math.max(1, Math.round(raster.height * scale));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y / scale);
    const y1 = Math.min(raster.height, Math.max(y0 + 1, Math.floor((y + 1) / scale)));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x / scale);
      const x1 = Math.min(raster.width, Math.max(x0 + 1, Math.floor((x + 1) / scale)));
      const sum = [0, 0, 0, 0];
      let n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * raster.width + sx) * 4;
          for (let c = 0; c < 4; c++) sum[c]! += raster.data[i + c]!;
          n++;
        }
      }
      const o = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) data[o + c] = Math.round(sum[c]! / n);
    }
  }
  return { width, height, data };
}

/**
 * How many values a plate gives. Eight, not six: a style often comes down to
 * one small accent, and past this many colours the smallest is the one left
 * out, so six lost the ultramarine edge of a watercolour at 4% of its pixels.
 */
export const VALUES = 8;

/** How far apart two values can be and still be one colour: a shade apart, not two paints. */
const ONE_COLOUR = 40;

/**
 * The dominant values. The colour space is cut, box by box (the one with the
 * widest spread first), at the middle of its widest channel's range, into
 * more boxes than asked for: a cut at the middle of the range falls between
 * two colours, where one at the median pixel falls through one. Every pixel
 * then goes to the nearest of the boxes' averages, which gives each colour
 * its true share.
 * Down to `count`, the two nearest colours are merged while they're close
 * enough to be one colour; past that, the smallest is left out rather than
 * blended into another, so every value is a colour that's really in the
 * image. Sorted dark to light. Transparent pixels don't count.
 */
export function dominantValues(raster: Raster, count = VALUES): Swatch[] {
  const small = shrink(raster, 400);
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < small.data.length; i += 4) if (small.data[i + 3]! >= 128) pixels.push([small.data[i]!, small.data[i + 1]!, small.data[i + 2]!]);
  if (pixels.length === 0) return [];
  const spread = (box: [number, number, number][]) => {
    const lo = [255, 255, 255];
    const hi = [0, 0, 0];
    for (const p of box) for (let c = 0; c < 3; c++) {
      if (p[c]! < lo[c]!) lo[c] = p[c]!;
      if (p[c]! > hi[c]!) hi[c] = p[c]!;
    }
    const ranges = [0, 1, 2].map((c) => hi[c]! - lo[c]!);
    const channel = ranges.indexOf(Math.max(...ranges));
    return { channel, range: ranges[channel]!, middle: (lo[channel]! + hi[channel]!) / 2 };
  };
  const boxes: [number, number, number][][] = [pixels];
  while (boxes.length < Math.max(count * 4, 24)) {
    let at = -1;
    let widest = 0;
    boxes.forEach((box, i) => {
      const { range } = spread(box);
      if (box.length > 1 && range > widest) [at, widest] = [i, range];
    });
    if (at < 0) break;
    const box = boxes[at]!;
    const { channel, middle } = spread(box);
    boxes.splice(at, 1, box.filter((p) => p[channel]! <= middle), box.filter((p) => p[channel]! > middle));
  }
  const mean = (box: [number, number, number][]) => [0, 1, 2].map((c) => box.reduce((sum, p) => sum + p[c]!, 0) / box.length);
  const centres = boxes.map(mean);
  // Each pixel to its nearest value: the shares are real, and each value is the average of what it holds.
  const held = centres.map(() => [0, 0, 0, 0]);
  for (const p of pixels) {
    let best = 0;
    let bestDistance = Infinity;
    centres.forEach((c, i) => {
      const d = (p[0] - c[0]!) ** 2 + (p[1] - c[1]!) ** 2 + (p[2] - c[2]!) ** 2;
      if (d < bestDistance) [best, bestDistance] = [i, d];
    });
    const h = held[best]!;
    h[0]! += p[0];
    h[1]! += p[1];
    h[2]! += p[2];
    h[3]! += 1;
  }
  const colours = held.filter((h) => h[3]! > 0).map((h) => ({ rgb: [0, 1, 2].map((c) => h[c]! / h[3]!), n: h[3]! }));
  const distance = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
  while (colours.length > count) {
    let pair: [number, number] = [0, 1];
    let nearest = Infinity;
    for (let i = 0; i < colours.length; i++) {
      for (let j = i + 1; j < colours.length; j++) {
        const d = distance(colours[i]!.rgb, colours[j]!.rgb);
        if (d < nearest) [pair, nearest] = [[i, j], d];
      }
    }
    if (nearest <= ONE_COLOUR) {
      const [a, b] = [colours[pair[0]]!, colours[pair[1]]!];
      const n = a.n + b.n;
      a.rgb = a.rgb.map((v, c) => (v * a.n + b.rgb[c]! * b.n) / n);
      a.n = n;
      colours.splice(pair[1], 1);
    } else {
      colours.splice(colours.indexOf(colours.reduce((small, c) => (c.n < small.n ? c : small))), 1);
    }
  }
  return colours
    .map(({ rgb, n }) => {
      const [r, g, b] = rgb.map(Math.round) as [number, number, number];
      return { r, g, b, share: n / pixels.length };
    })
    .sort((a, b) => luminance(a.r, a.g, a.b) - luminance(b.r, b.g, b.b))
    .map(({ r, g, b, share }) => ({ hex: toHex(r, g, b), share }));
}

/** The values as a strip of swatches, 120 by 64 each. */
export function strip(values: Swatch[], width = 120, height = 64): Raster {
  const data = new Uint8Array(width * values.length * height * 4);
  values.forEach(({ hex }, i) => {
    const rgb = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const o = (y * width * values.length + i * width + x) * 4;
        data.set([rgb[0]!, rgb[1]!, rgb[2]!, 255], o);
      }
    }
  });
  return { width: width * values.length, height, data };
}

export interface CropSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
}

/** `x,y,w,h:name`, in the source's pixels. */
export function parseCrop(spec: string): CropSpec {
  const m = /^(\d+),(\d+),(\d+),(\d+):([a-z0-9][a-z0-9-]*)$/i.exec(spec.trim());
  if (!m) throw new Error(`"${spec}" isn't a crop. Give it as x,y,w,h:name in the image's pixels: 120,340,80,80:grain`);
  const [x, y, width, height] = [m[1], m[2], m[3], m[4]].map(Number) as [number, number, number, number];
  if (width === 0 || height === 0) throw new Error(`"${spec}" is empty: its width and height are more than 0.`);
  return { x, y, width, height, name: m[5]!.toLowerCase() };
}

/** A region, magnified with nearest neighbour so texture stays honest. Clipped to the image. */
export function crop(raster: Raster, spec: CropSpec, zoom: number): Raster {
  const x0 = Math.min(spec.x, raster.width - 1);
  const y0 = Math.min(spec.y, raster.height - 1);
  const w = Math.max(1, Math.min(spec.width, raster.width - x0));
  const h = Math.max(1, Math.min(spec.height, raster.height - y0));
  const width = w * zoom;
  const height = h * zoom;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((y0 + Math.floor(y / zoom)) * raster.width + (x0 + Math.floor(x / zoom))) * 4;
      data.set(raster.data.subarray(i, i + 4), (y * width + x) * 4);
    }
  }
  return { width, height, data };
}

export interface SampleOptions {
  image: string;
  out: string;
  /** `x,y,w,h`: one reference inside a collage, sampled as its own plate. Crops stay in the whole image's pixels. */
  region?: string;
  swatches?: number;
  crops?: string[];
  zoom?: number;
  maxWidth?: number;
}

export interface SampleResult {
  values: Swatch[];
  files: string[];
  width: number;
  height: number;
}

/** The image's bytes, or what's wrong with its path, in words. */
async function readImage(image: string): Promise<Uint8Array> {
  try {
    return await readFile(image);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOENT") throw new Error(`There's no image at ${image}. Give the path of a PNG or JPEG that's on disk.`, { cause: error });
    if (code === "EISDIR") throw new Error(`${image} is a folder. Give the path of one image inside it.`, { cause: error });
    throw new Error(`Couldn't read ${image}: ${(error as Error).message}`, { cause: error });
  }
}

/** `x,y,w,h`, in the image's pixels. */
export function parseRegion(spec: string): CropSpec {
  const m = /^(\d+),(\d+),(\d+),(\d+)$/.exec(spec.trim());
  if (!m) throw new Error(`"${spec}" isn't a region. Give it as x,y,w,h in the image's pixels: 0,0,800,600`);
  return parseCrop(`${spec.trim()}:region`);
}

export async function sample({ image, out, region, swatches = VALUES, crops = [], zoom = 6, maxWidth = 1600 }: SampleOptions): Promise<SampleResult> {
  const specs = crops.map(parseCrop);
  const whole = decode(await readImage(image), image);
  // One tile of a collage is its own plate: the reference and its values come from the tile alone.
  const raster = region ? crop(whole, parseRegion(region), 1) : whole;
  await mkdir(out, { recursive: true });
  const files: string[] = [];

  // The plate: the file itself when it's a PNG that fits, a PNG copy otherwise.
  const reference = join(out, "reference.png");
  if (!region && extname(image).toLowerCase() === ".png" && raster.width <= maxWidth) await copyFile(image, reference);
  else await writeFile(reference, encode(shrink(raster, maxWidth, maxWidth * 10)));
  files.push(reference);

  const values = dominantValues(raster, swatches);
  const valuesPath = join(out, "values.png");
  await writeFile(valuesPath, encode(strip(values)));
  files.push(valuesPath);

  for (const spec of specs) {
    const path = join(out, `crop-${spec.name}.png`);
    await writeFile(path, encode(crop(whole, spec, zoom)));
    files.push(path);
  }
  return { values, files, width: raster.width, height: raster.height };
}
