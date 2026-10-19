import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Echo has eight petals, always: it's the brand's mark. The 3D Echo's body is the mesh
 * in echo.glb; this reads its outline around its centre and counts the lobes,
 * and holds the rest of the 3D code to never reshaping it vertex by vertex, so
 * whatever it does at runtime — a hop, a squash on landing, a skin — is a
 * transform or a material, and eight petals stay eight.
 */
const here = dirname(fileURLToPath(import.meta.url));
const MODEL = resolve(here, "../../../public/models/echo.glb");

/** The Body mesh's vertex positions, read straight from the GLB. */
function bodyPositions(file: string): Float32Array {
  const glb = readFileSync(file);
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8")) as {
    meshes: { name: string; primitives: { attributes: { POSITION: number } }[] }[];
    accessors: { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string }[];
    bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
    extensionsUsed?: string[];
  };
  // Compressed geometry needs its decoder here before the outline can be read.
  assert.deepEqual(gltf.extensionsUsed ?? [], [], "echo.glb is compressed: decode it before counting petals");
  const body = gltf.meshes.find((m) => m.name === "Body");
  assert.ok(body, "echo.glb has a Body mesh");
  const accessor = gltf.accessors[body.primitives[0]!.attributes.POSITION]!;
  assert.equal(accessor.componentType, 5126, "positions are float32");
  const view = gltf.bufferViews[accessor.bufferView]!;
  const bin = 20 + jsonLength + 8;
  const stride = view.byteStride ?? 12;
  const out = new Float32Array(accessor.count * 3);
  for (let i = 0; i < accessor.count; i++) {
    const at = bin + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + i * stride;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = glb.readFloatLE(at + k * 4);
  }
  return out;
}

/** Lobes of an outline: peaks of its radius around the centre, each standing clear of the dips beside it. */
function countLobes(xy: [number, number][]): number {
  const BINS = 720;
  const cx = xy.reduce((s, p) => s + p[0], 0) / xy.length;
  const cy = xy.reduce((s, p) => s + p[1], 0) / xy.length;
  const radius = new Array<number>(BINS).fill(0);
  for (const [x, y] of xy) {
    const bin = Math.floor(((Math.atan2(y - cy, x - cx) + Math.PI) / (2 * Math.PI)) * BINS) % BINS;
    radius[bin] = Math.max(radius[bin]!, Math.hypot(x - cx, y - cy));
  }
  // Fill any empty bin from its neighbours, then smooth a little.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < BINS; i++) if (radius[i] === 0) radius[i] = Math.max(radius[(i + BINS - 1) % BINS]!, radius[(i + 1) % BINS]!);
  }
  const smooth = radius.map((_, i) => {
    let sum = 0;
    for (let d = -4; d <= 4; d++) sum += radius[(i + d + BINS) % BINS]!;
    return sum / 9;
  });
  const max = Math.max(...smooth);
  const span = BINS / 32;
  let lobes = 0;
  for (let i = 0; i < BINS; i++) {
    const r = smooth[i]!;
    let peak = true;
    let dip = Infinity;
    for (let d = 1; d <= span; d++) {
      const left = smooth[(i - d + BINS) % BINS]!;
      const right = smooth[(i + d) % BINS]!;
      if (left > r || right >= r) peak = false;
      dip = Math.min(dip, left, right);
    }
    if (peak && r - dip > max * 0.03) lobes++;
  }
  return lobes;
}

test("Echo's 3D body has eight petals", () => {
  const positions = bodyPositions(MODEL);
  const xy: [number, number][] = [];
  for (let i = 0; i < positions.length; i += 3) xy.push([positions[i]!, positions[i + 1]!]);
  assert.equal(countLobes(xy), 8);
});

test("the lobe count tells eight from seven and nine", () => {
  const flower = (n: number) =>
    Array.from({ length: 2000 }, (_, i) => {
      const a = (i / 2000) * 2 * Math.PI;
      const r = 1 + 0.18 * Math.cos(n * a);
      return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
    });
  assert.equal(countLobes(flower(7)), 7);
  assert.equal(countLobes(flower(8)), 8);
  assert.equal(countLobes(flower(9)), 9);
});

test("nothing in the 3D code reshapes the body vertex by vertex", () => {
  const writes = /attributes\.position|getAttribute\(["']position["']\)|setXYZ|\.position\.array|morphAttributes|morphTargetInfluences/;
  const offenders = readdirSync(here)
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"))
    .filter((f) => writes.test(readFileSync(join(here, f), "utf8")));
  assert.deepEqual(offenders, []);
});
