import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { crop, decode, dominantValues, encode, parseCrop, parseRegion, sample, shrink, type Raster } from "./style-sample";

/** A raster painted by a function of x and y. */
function paint(width: number, height: number, colour: (x: number, y: number) => [number, number, number, number]): Raster {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(colour(x, y), (y * width + x) * 4);
  return { width, height, data };
}

test("two colours, half and half, are two values at half each, dark first", () => {
  const values = dominantValues(paint(40, 20, (x) => (x < 20 ? [200, 30, 30, 255] : [20, 20, 90, 255])));
  assert.deepEqual(values, [
    { hex: "#14145A", share: 0.5 },
    { hex: "#C81E1E", share: 0.5 },
  ]);
});

test("shares are what each value holds, and transparent pixels don't count", () => {
  const values = dominantValues(paint(40, 10, (x) => (x < 10 ? [0, 0, 0, 0] : x < 30 ? [240, 240, 240, 255] : [10, 10, 10, 255])));
  assert.equal(values.length, 2);
  assert.equal(values[0]!.hex, "#0A0A0A");
  assert.ok(Math.abs(values[0]!.share - 1 / 3) < 0.01, String(values[0]!.share));
  assert.ok(Math.abs(values[1]!.share - 2 / 3) < 0.01, String(values[1]!.share));
});

/**
 * With more colours in an image than values asked for, median cut
 * blended two of them into one value: on a moodboard's swatch tile, its plum
 * and its dark green came back as one olive at 20% of the pixels, a colour
 * that's nowhere in the image.
 */
test("with more colours than values, the smallest is left out, never blended into another", () => {
  const bands: [number, [number, number, number]][] = [
    [30, [255, 255, 255]],
    [20, [0, 0, 0]],
    [15, [220, 30, 30]],
    [12, [30, 160, 40]],
    [10, [30, 50, 220]],
    [8, [240, 220, 20]],
    [5, [40, 220, 230]],
  ];
  const edges = bands.reduce<number[]>((acc, [w]) => [...acc, (acc.at(-1) ?? 0) + w], []);
  const image = paint(100, 10, (x) => [...bands[edges.findIndex((e) => x < e)]![1], 255]);
  const values = dominantValues(image, 6);
  assert.equal(values.length, 6);
  const rgb = (hex: string) => [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
  for (const { hex, share } of values) {
    const painted = bands.find(([, c]) => rgb(hex).every((v, i) => Math.abs(v - c[i]!) <= 2));
    assert.ok(painted, `${hex} isn't a colour in the image`);
    assert.ok(Math.abs(share - painted[0] / 100) < 0.01, `${hex} holds ${share}, painted ${painted[0] / 100}`);
  }
  assert.ok(!values.some(({ hex }) => hex === "#28DCE6"), "the smallest colour is the one left out");
});

/**
 * A missing image gave Node's own message ("ENOENT: no such file or
 * directory, open '../moodboard.png'"), where every other refusal in the CLI
 * says what's wrong in words.
 */
test("a missing image, or a folder, is said in words", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-sample-missing-"));
  try {
    await assert.rejects(sample({ image: join(dir, "moodboard.png"), out: join(dir, "out") }), (error: Error) => {
      assert.match(error.message, /^There's no image at .*moodboard\.png\./);
      assert.doesNotMatch(error.message, /ENOENT/);
      return true;
    });
    await assert.rejects(sample({ image: dir, out: join(dir, "out") }), /is a folder/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a smaller copy averages what each pixel covers", () => {
  const small = shrink(paint(4, 2, (x) => (x % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255])), 2);
  assert.equal(small.width, 2);
  assert.equal(small.height, 1);
  assert.deepEqual([...small.data.subarray(0, 4)], [128, 128, 128, 255]);
});

test("a crop is magnified pixel for pixel, and clipped to the image", () => {
  const image = paint(4, 4, (x, y) => [x * 60, y * 60, 0, 255]);
  const zoomed = crop(image, { x: 1, y: 2, width: 2, height: 1, name: "edge" }, 3);
  assert.equal(zoomed.width, 6);
  assert.equal(zoomed.height, 3);
  assert.deepEqual([...zoomed.data.subarray(0, 4)], [60, 120, 0, 255]);
  assert.deepEqual([...zoomed.data.subarray(3 * 4, 3 * 4 + 4)], [120, 120, 0, 255]);
  const clipped = crop(image, { x: 3, y: 3, width: 10, height: 10, name: "corner" }, 2);
  assert.equal(clipped.width, 2);
});

test("a crop is x,y,w,h:name, and anything else says how to write one", () => {
  assert.deepEqual(parseCrop("120,340,80,80:grain"), { x: 120, y: 340, width: 80, height: 80, name: "grain" });
  assert.throws(() => parseCrop("120,340,80:grain"), /x,y,w,h:name/);
  assert.throws(() => parseCrop("1,2,0,5:flat"), /empty/);
});

test("only PNG and JPEG are read, and anything else is refused by name", () => {
  assert.throws(() => decode(new Uint8Array([0x52, 0x49, 0x46, 0x46]), "board.webp"), /board\.webp isn't a PNG or a JPEG/);
  const round = decode(encode(paint(3, 2, () => [1, 2, 3, 255])), "made.png");
  assert.equal(round.width, 3);
  assert.deepEqual([...round.data.subarray(0, 4)], [1, 2, 3, 255]);
});

test("sample writes the plate, the values strip and each crop, and says the values", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-sample-"));
  try {
    const image = join(dir, "board.png");
    await writeFile(image, encode(paint(60, 30, (x) => (x < 30 ? [230, 220, 210, 255] : [40, 20, 30, 255]))));
    const out = join(dir, "assets");
    const result = await sample({ image, out, crops: ["0,0,10,10:paper"], zoom: 4 });
    assert.deepEqual((await readdir(out)).sort(), ["crop-paper.png", "reference.png", "values.png"]);
    assert.equal(result.values.length, 2);
    const strip = decode(await readFile(join(out, "values.png")), "values.png");
    assert.equal(strip.width, 240);
    assert.equal(decode(await readFile(join(out, "crop-paper.png")), "crop").width, 40);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a region samples one tile of a collage as its own plate, and crops stay in the whole image", async () => {
  const dir = await mkdtemp(join(tmpdir(), "echo-sample-region-"));
  try {
    const image = join(dir, "collage.png");
    // Left tile red, right tile blue.
    await writeFile(image, encode(paint(80, 40, (x) => (x < 40 ? [200, 20, 20, 255] : [20, 20, 200, 255]))));
    const out = join(dir, "blue");
    const result = await sample({ image, out, region: "40,0,40,40", crops: ["0,0,10,10:red-corner"], zoom: 2 });
    assert.deepEqual(result.values, [{ hex: "#1414C8", share: 1 }]);
    assert.equal(decode(await readFile(join(out, "reference.png")), "reference").width, 40);
    const corner = decode(await readFile(join(out, "crop-red-corner.png")), "crop");
    assert.deepEqual([...corner.data.subarray(0, 4)], [200, 20, 20, 255]);
    assert.throws(() => parseRegion("40,0,40"), /x,y,w,h/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});


test("a plate gives eight values unless asked for another number, so a small accent stays in", () => {
  // Nine colours: a white field, seven colours at 10% down to 3%, and a 2% accent that's the eighth-largest.
  const bands: [number, [number, number, number]][] = [
    [40, [250, 250, 250]],
    [12, [20, 20, 20]],
    [10, [200, 40, 40]],
    [10, [40, 160, 60]],
    [9, [240, 200, 30]],
    [8, [120, 60, 160]],
    [6, [40, 200, 210]],
    [3, [6, 72, 199]],
    [2, [250, 120, 20]],
  ];
  const edges = bands.reduce<number[]>((acc, [w]) => [...acc, (acc.at(-1) ?? 0) + w], []);
  const image = paint(100, 10, (x) => [...bands[edges.findIndex((e) => x < e)]![1], 255]);
  const values = dominantValues(image);
  assert.equal(values.length, 8);
  assert.ok(values.some(({ hex }) => hex === "#0648C7"), "the 3% ultramarine is kept");
});
