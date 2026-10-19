/**
 * Echo's island: a piece of land floating in the night, where every
 * supporter's Echo lives. A miniature, lit for real: moonlight with soft
 * shadows, a warm light from the device on the hill, fog for depth, all in
 * Echo's own materials (the glazed body, soft clay land, the brand's blues).
 *
 * Noor's Echo stands on the hill in the middle, in front of Echo's device,
 * which glows like a lit house. Founding and monthly supporters live in the
 * village round the hill, one-time supporters out across the meadows, and
 * empty plots at the edges carry a small sign for the next. Everyone turns
 * to face you.
 *
 * Pure three.js: the React side (Island.tsx) draws the names and the keys.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  AdditiveBlending,
  Matrix4,
  Points,
  PointsMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  RingGeometry,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  TOUCH,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Creature3D, loadModel, shadowTexture } from "@/components/home/echo3d/creature";
import { eyeMask, faceUniforms } from "@/components/home/echo3d/material";
import { echoMarble, hexToOklch, oklchToHex } from "@/components/home/echo3d/palette";
import { pageColour } from "@/components/home/echo3d/stage";
import { random } from "@/components/home/echo3d/pile";
import { brandSkin, MODEL } from "./photos";
import { skinOf, thinFilm } from "./finish";
import type { Person } from "./people";


/* ------------------------------------------------------------------ noise */

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    s += a * vnoise(x * f, y * f);
    f *= 2;
    a *= 0.5;
  }
  return s / 0.9375;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ----------------------------------------------------------------- layout */

interface Spot {
  person: Person;
  x: number;
  z: number;
  size: number;
  /** A small turn of its own, so the crowd doesn't face you like soldiers. */
  turn: number;
}

/** Where everyone lives: Noor on the hill, the village round it, the meadows beyond, plots at the end of each. */
function plan(people: readonly Person[]) {
  const rnd = random(17);
  const spots: Spot[] = [];
  // Each free plot knows whose it waits for: the village's are for monthly supporters, the meadows' for one-time ones.
  const plots: { x: number; z: number; plan: "monthly" | "once"; size: number }[] = [];
  const maker = people.find((p) => p.plan === "maker");
  // Noor a step in front of her house, so the house stands behind her, never under her.
  if (maker) spots.push({ person: maker, x: 0, z: 0.75, size: 1.5, turn: 0 });

  let r = 3.1;
  const place = (plotPlan: "monthly" | "once", items: (Person | null)[], size: number, gap: number, jitter: number) => {
    let i = 0;
    while (i < items.length) {
      const capacity = Math.max(6, Math.floor((2 * Math.PI * r) / gap));
      const here = items.slice(i, i + capacity);
      const offset = rnd() * Math.PI * 2;
      here.forEach((p, k) => {
        const a = offset + (k / here.length) * Math.PI * 2 + (rnd() - 0.5) * jitter * 0.3;
        const rr = r + (rnd() - 0.5) * jitter;
        const x = Math.cos(a) * rr;
        const z = Math.sin(a) * rr;
        if (p) spots.push({ person: p, x, z, size, turn: (rnd() - 0.5) * 0.7 });
        else plots.push({ x, z, plan: plotPlan, size });
      });
      i += capacity;
      r += gap * 0.95;
    }
  };
  place("monthly", [...people.filter((p) => p.plan === "monthly"), null, null, null], 1, 1.45, 0.25);
  r += 0.5;
  place("once", [...people.filter((p) => p.plan === "once"), null, null, null, null], 0.85, 1.3, 0.7);
  return { spots, plots, radius: r + 1.4 };
}

/* ----------------------------------------------------------------- colour */

function palette(accent: string) {
  const [, , h] = hexToOklch(accent);
  const c = (L: number, C: number, dh = 0) => new Color(oklchToHex([L, C, h + dh]));
  return {
    meadow: c(0.76, 0.05),
    hollow: c(0.62, 0.075, -8),
    crest: c(0.85, 0.035, 4),
    rock: c(0.33, 0.075, 6),
    rockDeep: c(0.21, 0.06, 10),
    soil: c(0.5, 0.06, 14),
    bush: (k: number) => c(0.5 + k * 0.12, 0.055, 4 + k * 8),
    flower: (k: number) => (k < 0.5 ? new Color(oklchToHex([0.95, 0.02, h])) : c(0.82, 0.09, -30)),
    fog: c(0.16, 0.05, 8),
    chassis: c(0.24, 0.035),
  };
}

/* ---------------------------------------------------------------- the land */

function island(R: number, colours: ReturnType<typeof palette>) {
  const edge = (a: number) => R * (0.92 + 0.16 * (fbm(Math.cos(a) * 1.4 + 3.1, Math.sin(a) * 1.4 + 7.7) - 0.5));
  const hillR = Math.max(2.4, R * 0.24);
  const height = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    const q = r / edge(Math.atan2(z, x));
    return 1.6 * Math.exp(-((r / hillR) ** 2)) + 0.55 * (fbm(x * 0.15 + 11, z * 0.15 + 3) - 0.5) - smooth(0.84, 1, q) * 0.55;
  };

  // The top: a polar grid out to the island's ragged edge.
  const NR = 56;
  const NS = 180;
  const top = new Float32Array((NR + 1) * NS * 3);
  const topColour = new Float32Array((NR + 1) * NS * 3);
  const tmp = new Color();
  for (let i = 0; i <= NR; i++) {
    for (let j = 0; j < NS; j++) {
      const a = (j / NS) * Math.PI * 2;
      const r = (i / NR) * edge(a);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = height(x, z);
      const k = (i * NS + j) * 3;
      top.set([x, y, z], k);
      const lift = smooth(-0.2, 1.4, y);
      tmp.copy(colours.hollow).lerp(colours.meadow, lift).lerp(colours.crest, smooth(1.0, 1.6, y));
      const speck = (fbm(x * 1.7, z * 1.7) - 0.5) * 0.07;
      topColour.set([tmp.r + speck, tmp.g + speck, tmp.b + speck], k);
    }
  }
  const topIndex: number[] = [];
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NS; j++) {
      const a = i * NS + j;
      const b = i * NS + ((j + 1) % NS);
      const c = (i + 1) * NS + j;
      const d = (i + 1) * NS + ((j + 1) % NS);
      topIndex.push(a, b, c, b, d, c);
    }
  }
  const topGeo = new BufferGeometry();
  topGeo.setAttribute("position", new BufferAttribute(top, 3));
  topGeo.setAttribute("color", new BufferAttribute(topColour, 3));
  topGeo.setIndex(topIndex);
  topGeo.computeVertexNormals();
  const land = new Mesh(topGeo, new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }));
  land.receiveShadow = true;

  // The underside: rock tapering to a point, a little soil at its lip, faceted like stone.
  const NK = 18;
  const under: number[] = [];
  const underColour: number[] = [];
  const depth = R * 0.95;
  for (let k = 0; k <= NK; k++) {
    const t = k / NK;
    for (let j = 0; j < NS; j += 2) {
      const a = (j / NS) * Math.PI * 2;
      const e = edge(a);
      const wobble = 1 + 0.22 * (fbm(Math.cos(a) * 2.2 + t * 3, Math.sin(a) * 2.2 + t * 3) - 0.5);
      const r = e * Math.pow(1 - t, 1.5) * (k === 0 ? 1 : wobble);
      const yEdge = height(Math.cos(a) * e, Math.sin(a) * e);
      const y = yEdge - 0.12 - depth * Math.pow(t, 0.85) - (k === 0 ? 0 : 0.4 * fbm(a * 3, t * 5));
      under.push(Math.cos(a) * r, y, Math.sin(a) * r);
      tmp.copy(k <= 1 ? colours.soil : colours.rock).lerp(colours.rockDeep, smooth(0.15, 1, t));
      underColour.push(tmp.r, tmp.g, tmp.b);
    }
  }
  const NU = NS / 2;
  const underIndex: number[] = [];
  for (let k = 0; k < NK; k++) {
    for (let j = 0; j < NU; j++) {
      const a = k * NU + j;
      const b = k * NU + ((j + 1) % NU);
      const c = (k + 1) * NU + j;
      const d = (k + 1) * NU + ((j + 1) % NU);
      underIndex.push(a, b, c, b, d, c);
    }
  }
  const underGeo = new BufferGeometry();
  underGeo.setAttribute("position", new BufferAttribute(new Float32Array(under), 3));
  underGeo.setAttribute("color", new BufferAttribute(new Float32Array(underColour), 3));
  underGeo.setIndex(underIndex);
  const rockGeo = underGeo.toNonIndexed();
  rockGeo.computeVertexNormals();
  underGeo.dispose();
  const rock = new Mesh(rockGeo, new MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true }));
  rock.castShadow = true;

  return { land, rock, height, edge };
}

/**
 * The hero's device, photographed: <BrandDevice away /> (brand/Device.tsx) alone at its homepage width,
 * 372px, in the brand's blue, at 3x, on a clear ground, saved as WebP. Remake it the same way when the
 * hero's device changes. Away, because Echo is out on the hill: AWAY and BACK SOON on its screen.
 */
const DEVICE_FACE = "/supporters/device-away.webp";
/** Where the house stands: the back of the hilltop. */
const HOME_Z = -2.1;
/** Its size on the homepage, px: the face keeps these proportions. */
const DEVICE_PX = { w: 372, h: 505, radius: 46 };

/**
 * Echo's device, the one in the homepage's hero: Noor's house on the hill.
 * Its face is the hero's own, photographed; the body behind it is the same
 * rounded slab in the chassis's colour (read off the photograph's edge), so
 * it has depth, catches the moon and casts a shadow like everything else.
 */
async function heroDevice() {
  const tex = await new TextureLoader().loadAsync(DEVICE_FACE);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  const img = tex.image as HTMLImageElement;
  const probe = document.createElement("canvas");
  probe.width = img.width;
  probe.height = img.height;
  const pc = probe.getContext("2d")!;
  pc.drawImage(img, 0, 0);
  const px = pc.getImageData(Math.round(img.width * 0.02), Math.round(img.height * 0.5), 1, 1).data;
  const chassis = new Color(`rgb(${px[0]}, ${px[1]}, ${px[2]})`);

  const w = 1.95;
  const h = (w * DEVICE_PX.h) / DEVICE_PX.w;
  const depth = 0.5;
  const g = new Group();
  const body = new Mesh(
    new RoundedBoxGeometry(w * 0.985, h * 0.985, depth, 8, (DEVICE_PX.radius / DEVICE_PX.w) * w * 0.98),
    new MeshPhysicalMaterial({ color: chassis, roughness: 0.62, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
  );
  body.castShadow = true;
  body.receiveShadow = true;
  const face = new Mesh(
    new PlaneGeometry(w, h),
    new MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.2 }),
  );
  face.position.z = depth / 2 + 0.004;
  face.receiveShadow = true;
  // Its back, like a real product's: the chassis, a speaker grille, and ECHO pressed into it.
  const back = new Mesh(
    new PlaneGeometry(w * 0.9, h * 0.9),
    new MeshStandardMaterial({ map: deviceBack(chassis), transparent: true, roughness: 0.7 }),
  );
  back.position.z = -depth / 2 - 0.004;
  back.rotation.y = Math.PI;
  back.receiveShadow = true;
  g.add(body, face, back);
  return { group: g, height: h };
}

/** The device's back: a grille of holes over an engraved ECHO, in its own chassis colour, lit from above. */
function deviceBack(chassis: Color) {
  const W = 372;
  const H = 505;
  const c = document.createElement("canvas");
  c.width = W * 2;
  c.height = H * 2;
  const x = c.getContext("2d")!;
  x.scale(2, 2);
  const hex = (col: Color) => `#${col.getHexString()}`;
  const light = chassis.clone().offsetHSL(0, 0, 0.06);
  const deep = chassis.clone().offsetHSL(0, 0, -0.05);
  // The speaker grille: rows of pressed holes.
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 13; col++) {
      const cx = W / 2 + (col - 6) * 18;
      const cy = 120 + row * 18;
      x.fillStyle = hex(deep);
      x.beginPath();
      x.arc(cx, cy, 3.4, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = hex(light);
      x.beginPath();
      x.arc(cx, cy + 1.2, 3.4, 0, Math.PI, false);
      x.fill();
    }
  }
  // ECHO, pressed in: a shadow above the letters, light along their lower edge.
  x.textAlign = "center";
  x.font = "800 64px ui-sans-serif, system-ui, sans-serif";
  x.fillStyle = hex(light);
  x.fillText("ECHO", W / 2, 382);
  x.fillStyle = hex(deep);
  x.fillText("ECHO", W / 2, 379);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A mote's soft round light: points are drawn square without one. */
function moteTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

/** A beam's light: brightest at the ground, gone by the top. */
function beamTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, "rgba(255,255,255,0.32)");
  g.addColorStop(0.3, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 4, 128);
  return new CanvasTexture(c);
}

/**
 * An empty plot, asking for its supporter: the Echo that will stand there,
 * already there as a glowing ghost in the brand's blue, breathing; a beam of
 * light up into the night, so a free place shows from anywhere on the
 * island; and a ring going out along the ground from it, the way an echo
 * does. The page writes "Your Echo here" over it (Island.tsx).
 */
function claim(body: BufferGeometry, accent: string, highlight: string, reach = 1) {
  const g = new Group();
  const glow = new Color(highlight).lerp(new Color("#ffffff"), 0.25);
  const ghostMat = new MeshStandardMaterial({
    color: accent,
    emissive: glow,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.38,
    roughness: 0.3,
    depthWrite: false,
  });
  const ghost = new Mesh(body, ghostMat);
  const SIZE = 0.85;
  ghost.scale.setScalar(SIZE / 2);
  ghost.position.y = (SIZE / 2) * 0.94;
  const beamMat = new MeshBasicMaterial({
    color: glow,
    map: beamTexture(),
    transparent: true,
    opacity: 0.7,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  });
  const beam = new Mesh(new CylinderGeometry(0.2, 0.3, 7 * reach, 32, 1, true), beamMat);
  beam.position.y = 3.5 * reach;
  const ringMat = new MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.6, side: DoubleSide, depthWrite: false });
  const ring = new Mesh(new RingGeometry(0.42, 0.48, 48), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  const base = new Mesh(new RingGeometry(0.4, 0.44, 48), new MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.8, side: DoubleSide }));
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.025;
  g.add(ghost, beam, ring, base);
  return { group: g, ghost, ghostMat, beamMat, ring, ringMat, phase: Math.random() * 3 };
}

/* ----------------------------------------------------------------- the world */

export type Hit = { kind: "person"; id: string } | { kind: "plot"; index: number } | { kind: "you" };

/** A visitor trying their Echo on: the id their shade of blue comes from, and how they'd support. */
export type Visitor = { id: string; plan: "monthly" | "once" };

export interface IslandWorld {
  pick(x: number, y: number): Hit | null;
  /** Where a person's name goes on screen: just above their head. */
  label(id: string): { x: number; y: number; ok: boolean } | null;
  plotLabel(i: number): { x: number; y: number; ok: boolean; depth: number } | null;
  /** How many plots wait for a next supporter. */
  plots: number;
  focus(id: string | null): void;
  zoom(step: number): void;
  pause(paused: boolean): void;
  light(ids: ReadonlySet<string>, hover: string | null): void;
  onFrame: (() => void) | null;
  /** Manual worlds only (the video): move the world on by `dt` seconds and draw one frame. */
  advance(dt: number): void;
  /** Raise what the camera sees by this share of the view's height (the video, when a card covers the foot). */
  lift(share: number): void;
  /**
   * Start the camera round the island so that, turning by itself, it's on `id`'s side of it after `seconds`:
   * the video's glide down to them is then straight in, with nothing in between. Noor's side is the front.
   */
  startFacing(id: string, seconds: number): void;
  /**
   * A visitor's Echo, as it would be (the support page): it drops onto the free plot that waits for their kind of
   * support, in their own shade and finish, and, with `come`, the camera comes down to it. Another kind of support
   * moves it to that kind's plot; `null` gives the plot back.
   */
  preview(who: Visitor | null, come?: boolean): void;
  /** The free plot a visitor's Echo would take, for that kind of support: the one in front, the house behind it. */
  yours(plan: Visitor["plan"]): number;
  /** Where the visitor's name goes: just above their Echo's head, once it has landed. */
  youLabel(): { x: number; y: number; ok: boolean } | null;
  /** The visitor's Echo jumps for joy. */
  cheer(): void;
  dispose(): void;
}

export interface IslandOptions {
  /** A fixed size in pixels, for a canvas that isn't on the page (the video). Otherwise the canvas's own size. */
  size?: { w: number; h: number };
  /** Drawn only when told to (`advance`), at whatever pace that is, instead of every animation frame. */
  manual?: boolean;
  /** How fast the island turns by itself. Default 0.35. */
  spin?: number;
  /**
   * How a visit is framed. "page": close, looking down over the neighbours, the card under them. "video": further
   * back, them in the middle with the island round them, room for the title above and the card below.
   */
  visit?: "page" | "video";
  /**
   * How far right of the middle the island stands, as a share of the view's width, asked whenever the view changes
   * size: room for words on its left. Default none.
   */
  shift?: () => number;
  /** How much further back than usual the camera stands, to see the island whole. Default 1. */
  far?: number;
  /**
   * How far the canvas runs above the view the island is framed in, px, asked whenever it changes size: the island
   * stays framed in the canvas's lower part, and the sky over it carries on up behind whatever is there (the support
   * page's ask). Default none.
   */
  above?: () => number;
  /** How tall the free plots' beams are, times their usual height: tall enough to rise into that sky. Default 1. */
  reach?: number;
}

export async function createIsland(
  canvas: HTMLCanvasElement,
  people: readonly Person[],
  reduced: boolean,
  options: IslandOptions = {},
): Promise<IslandWorld> {
  const W = () => options.size?.w ?? canvas.clientWidth;
  const H = () => options.size?.h ?? canvas.clientHeight;
  /** The frame the island is composed in: the canvas, less what runs on above it. */
  const F = () => Math.max(1, H() - (options.above?.() ?? 0));
  const accent = pageColour("--echo-accent", "#3D8EF0");
  const highlight = pageColour("--echo-accent-highlight", "#7FB2F5");
  const pressed = pageColour("--echo-accent-pressed", "#2A6BC4");
  const colours = palette(accent);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.setPixelRatio(options.size ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.42;
  room.dispose();
  pmrem.dispose();

  const { spots, plots, radius: R } = plan(people);
  // On a narrow screen the island is wider than the view, so the camera stands further back (and the fog with it).
  const narrow = Math.max(1, 1.35 / Math.max(0.3, W() / F())) ** 0.7 * (options.far ?? 1);
  scene.fog = new Fog(colours.fog, R * 2.4 * narrow, R * 6.5 * narrow);

  // Moonlight, cool and soft-shadowed; the sky's own light; the brand's rim from behind.
  const sky = new HemisphereLight(new Color(highlight).lerp(new Color("#ffffff"), 0.5), colours.rockDeep, 0.7);
  const moon = new DirectionalLight(0xeef3ff, 2.0);
  moon.position.set(-R * 0.8, R * 1.7, R * 1.1);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const sc = moon.shadow.camera;
  sc.left = sc.bottom = -R * 1.25;
  sc.right = sc.top = R * 1.25;
  sc.near = 0.5;
  sc.far = R * 6;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.03;
  const rim = new DirectionalLight(accent, 2.2);
  rim.position.set(R, R * 0.4, -R * 1.4);
  scene.add(sky, moon, moon.target, rim);

  const world = new Group();
  scene.add(world);
  const land = island(R, colours);
  world.add(land.land, land.rock);

  // Noor's house on the hill: the hero's own device, its screen's light falling on the hill.
  const home = await heroDevice();
  home.group.position.set(0, land.height(0, HOME_Z) + home.height / 2 - 0.06, HOME_Z);
  world.add(home.group);
  const lamp = new PointLight(new Color(highlight).lerp(new Color("#ffffff"), 0.35), 7, 6, 1.6);
  lamp.position.set(0, land.height(0, HOME_Z) + 1.6, HOME_Z + 1.1);
  world.add(lamp);

  // Bushes and small flowers, kept clear of everyone's place.
  const rnd = random(91);
  const clear = (x: number, z: number, room: number) =>
    spots.every((s) => Math.hypot(s.x - x, s.z - z) > room) && plots.every((p) => Math.hypot(p.x - x, p.z - z) > room) && Math.hypot(x, z - HOME_Z) > 1.9;
  const bushGeo = new IcosahedronGeometry(1, 2);
  const bushes = new InstancedMesh(bushGeo, new MeshStandardMaterial({ roughness: 0.92 }), Math.round(R * R * 0.32));
  const flowerGeo = new SphereGeometry(1, 8, 6);
  const flowers = new InstancedMesh(flowerGeo, new MeshStandardMaterial({ roughness: 0.4 }), Math.round(R * R * 0.7));
  const m = new Matrix4();
  const o = new Object3D();
  let nb = 0;
  let nf = 0;
  for (let tries = 0; tries < 6000 && (nb < bushes.count || nf < flowers.count); tries++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * land.edge(a) * 0.9;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = land.height(x, z);
    if (nb < bushes.count && rnd() < 0.3 && clear(x, z, 0.95)) {
      const s = 0.1 + rnd() * 0.16;
      o.position.set(x, y + s * 0.35, z);
      o.scale.set(s * (1 + rnd() * 0.6), s * (0.55 + rnd() * 0.3), s);
      o.rotation.set(0, rnd() * 6, 0);
      o.updateMatrix();
      bushes.setMatrixAt(nb, o.matrix);
      bushes.setColorAt(nb, colours.bush(rnd()));
      nb++;
    } else if (nf < flowers.count && clear(x, z, 0.6)) {
      const s = 0.025 + rnd() * 0.025;
      m.makeScale(s, s, s).setPosition(x, y + s, z);
      flowers.setMatrixAt(nf, m);
      flowers.setColorAt(nf, colours.flower(rnd()));
      nf++;
    }
  }
  bushes.count = nb;
  flowers.count = nf;
  bushes.castShadow = bushes.receiveShadow = true;
  world.add(bushes, flowers);

  // Rocks drifting round and below, the way pieces of a floating world do.
  const rocks = Array.from({ length: 6 }, (_, i) => {
    const s = 0.4 + rnd() * 0.9;
    const mesh = new Mesh(new IcosahedronGeometry(s, 0), new MeshStandardMaterial({ color: colours.rock, roughness: 0.8, flatShading: true }));
    mesh.castShadow = true;
    const a = (i / 6) * Math.PI * 2 + rnd();
    return { mesh, a, r: R * (1.15 + rnd() * 0.35), y: -R * (0.15 + rnd() * 0.55), speed: 0.03 + rnd() * 0.04 };
  });
  rocks.forEach((k) => scene.add(k.mesh));

  // Motes of the brand's light, drifting up round the island: the air of somewhere else.
  const MOTES = 140;
  const motePos = new Float32Array(MOTES * 3);
  const moteSeed = Array.from({ length: MOTES }, () => ({ a: rnd() * Math.PI * 2, r: R * (0.3 + rnd() * 1.1), y: rnd(), v: 0.15 + rnd() * 0.25 }));
  const moteGeo = new BufferGeometry();
  moteGeo.setAttribute("position", new BufferAttribute(motePos, 3));
  const motes = new Points(
    moteGeo,
    new PointsMaterial({
      color: new Color(highlight).lerp(new Color("#ffffff"), 0.4),
      map: moteTexture(),
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(motes);
  const placeMotes = () => {
    moteSeed.forEach((m, i) => {
      const y = ((m.y + time * m.v * 0.08) % 1) * R * 1.4 - R * 0.5;
      const a = m.a + time * 0.02;
      motePos.set([Math.cos(a) * m.r, y, Math.sin(a) * m.r], i * 3);
    });
    moteGeo.attributes.position!.needsUpdate = true;
  };

  // Everyone's Echo: the landing's own, in their finish.
  const model = await loadModel(MODEL);

  // The plots waiting for the next supporters: their Echo already there, as light.
  const claims = plots.map((p) => {
    const c = claim(model.body, accent, highlight, options.reach);
    c.group.position.set(p.x, land.height(p.x, p.z), p.z);
    world.add(c.group);
    return c;
  });
  const face = faceUniforms(model.map, eyeMask(), pageColour("--echo-text", "#E9F0FA"), pageColour("--echo-seam", "#131216"));
  const shadowTex = shadowTexture();
  const brand = brandSkin(accent, highlight, pressed);
  const echoes = spots.map((spot) => {
    const c = new Creature3D(model, echoMarble(accent, highlight, pressed), face, shadowTex);
    c.setOutline(null);
    // An Echo whose supporter's time has run out sleeps, lids down, until they support again.
    c.mood = spot.person.asleep ? "sleep" : "idle";
    c.setSkin(skinOf(spot.person, accent, brand));
    c.material.iridescenceThicknessRange = thinFilm(spot.person);
    // Real shadows here: the flat blob the page uses is put away.
    c.root.children[0]!.visible = false;
    c.root.traverse((n) => {
      if ((n as Mesh).isMesh && n !== c.root.children[0]) (n as Mesh).castShadow = true;
    });
    world.add(c.root);
    return { c, spot, grow: 1 };
  });
  const byId = new Map(echoes.map((e) => [e.spot.person.id, e]));

  // A visitor trying their Echo on: made the first time they type a name, kept on a plot of their kind of support.
  const yours = (plan: Visitor["plan"]) => {
    let best = -1;
    plots.forEach((p, i) => {
      if (p.plan === plan && (best < 0 || p.z > plots[best]!.z)) best = i;
    });
    return Math.max(0, best);
  };
  let you: { c: Creature3D; plot: number; shown: boolean; wait: number; fall: number; v: number } | null = null;
  const youY = () => {
    const p = plots[you!.plot]!;
    return land.height(p.x, p.z) + p.size * 0.47 + you!.fall;
  };

  // The camera: turned by dragging, glided to whoever is opened.
  const camera = new PerspectiveCamera(34, 1, 0.1, R * 20);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minPolarAngle = 0.45;
  controls.maxPolarAngle = 1.36;
  controls.minDistance = 2.6;
  controls.maxDistance = R * 6;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = options.spin ?? 0.35;
  // One finger scrolls the page; two turn and zoom the island. The wheel scrolls the page (Island.tsx).
  controls.touches = { ONE: null as unknown as TOUCH, TWO: TOUCH.DOLLY_ROTATE };
  if (!options.manual) canvas.style.touchAction = "pan-y";
  // Far enough back and low enough to see it float: the whole island in the sky, its rock beneath.
  const overview = {
    target: new Vector3(0, -R * 0.12, 0),
    position: new Vector3(Math.sin(0.35) * R * 2.75 * narrow, R * 0.95 * narrow, Math.cos(0.35) * R * 2.75 * narrow),
  };
  camera.position.copy(overview.position);
  controls.target.copy(overview.target);

  let raised = 0;
  const resize = () => {
    const w = W();
    const h = H();
    const f = F();
    renderer.setSize(w, h, false);
    camera.aspect = w / f;
    // The island is the page: centred, a little low, so the quiet title in the top left corner stays in the sky.
    // Where words share the view with it, it stands to their right. Composed in the frame; the canvas shows the
    // frame and whatever of the sky runs on above it.
    camera.setViewOffset(w, f, -w * (options.shift?.() ?? 0), f * (raised - (w / f > 1.1 ? 0.03 : 0.05)) - (h - f), w, h);
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = options.size ? null : new ResizeObserver(resize);
  ro?.observe(canvas);

  let lit: ReadonlySet<string> = new Set();
  let hover: string | null = null;
  let chosen: string | null = null;
  let paused = false;
  let flight: { from: [Vector3, Vector3]; to: [Vector3, Vector3]; t: number } | null = null;
  // Things due later, on the world's own clock, so a frame-by-frame video keeps them in step.
  let clock = 0;
  const due: { at: number; run: () => void }[] = [];
  const fly = (to: [Vector3, Vector3]) => {
    if (reduced) {
      camera.position.copy(to[1]);
      controls.target.copy(to[0]);
      return;
    }
    flight = { from: [controls.target.clone(), camera.position.clone()], to, t: 0 };
  };

  /**
   * The side the video sees someone from. Noor, and anyone in front of her house, from the front, so the house's
   * lit screen stands behind them; anyone behind the house from outside the island looking in, the camera swinging
   * to one side when the house's plain back would stand right behind them.
   */
  const videoSide = (at: { x: number; z: number; maker?: boolean }) => {
    if (at.maker) return new Vector3(0, 0, 1);
    const out = new Vector3(at.x, 0, at.z);
    const back = out.length() > 0.5 ? out.normalize() : new Vector3(0, 0, 1);
    // In front of the house: seen from the front, its lit screen behind them, as Noor is.
    if (at.z > HOME_Z) return back.add(new Vector3(0, 0, 1.2)).normalize();
    // Behind it: seen from outside, the camera swinging off the house's plain back.
    const toHouse = new Vector3(-at.x, 0, HOME_Z - at.z).normalize();
    // Seen from the camera, well back, the house has to be this far round from them to be out of the shot.
    const CLEAR = 1.75;
    const behind = back.clone().negate().angleTo(toHouse);
    if (behind >= CLEAR) return back;
    const Y = new Vector3(0, 1, 0);
    const turns = [back.clone().applyAxisAngle(Y, CLEAR - behind), back.clone().applyAxisAngle(Y, behind - CLEAR)];
    return turns.sort((a, b) => b.clone().negate().angleTo(toHouse) - a.clone().negate().angleTo(toHouse))[0]!;
  };

  const sideOf = (e: (typeof echoes)[number]) => videoSide({ x: e.spot.x, z: e.spot.z, maker: e.spot.person.plan === "maker" });

  const worldPos = (e: (typeof echoes)[number]) =>
    new Vector3(e.spot.x, land.height(e.spot.x, e.spot.z) + e.spot.size * 0.47, e.spot.z).add(world.position);

  const project = (v: Vector3) => {
    const p = v.clone().project(camera);
    return { x: ((p.x + 1) / 2) * W(), y: ((1 - p.y) / 2) * H(), ok: p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 };
  };

  let raf = 0;
  let last = performance.now();
  let time = 0;
  const api: IslandWorld = {
    pick(x, y) {
      let best: Hit | null = null;
      let bestDepth = Infinity;
      const pxPerUnit = (d: number) => F() / 2 / (Math.tan((camera.fov * Math.PI) / 360) * d);
      for (const e of echoes) {
        const v = worldPos(e);
        const s = project(v);
        const d = camera.position.distanceTo(v);
        const radius = (e.spot.size / 2) * pxPerUnit(d) * 1.1;
        if (s.ok && Math.hypot(s.x - x, s.y - y) < radius && d < bestDepth) {
          best = { kind: "person", id: e.spot.person.id };
          bestDepth = d;
        }
      }
      if (you?.c.visible) {
        const p = plots[you.plot]!;
        const v = new Vector3(p.x, youY(), p.z).add(world.position);
        const s = project(v);
        const d = camera.position.distanceTo(v);
        if (s.ok && Math.hypot(s.x - x, s.y - y) < (p.size / 2) * pxPerUnit(d) * 1.1 && d < bestDepth) {
          best = { kind: "you" };
          bestDepth = d;
        }
      }
      claims.forEach((cl, i) => {
        if (you?.shown && you.plot === i) return;
        const v = cl.group.position.clone().add(new Vector3(0, 0.45, 0)).add(world.position);
        const s = project(v);
        const d = camera.position.distanceTo(v);
        if (s.ok && Math.hypot(s.x - x, s.y - y) < 0.45 * pxPerUnit(d) && d < bestDepth) {
          best = { kind: "plot", index: i };
          bestDepth = d;
        }
      });
      return best;
    },
    label(id) {
      const e = byId.get(id);
      if (!e) return null;
      return project(worldPos(e).add(new Vector3(0, e.spot.size * 0.62 * e.grow, 0)));
    },
    plotLabel(i) {
      const cl = claims[i];
      if (!cl) return null;
      const v = cl.group.position.clone().add(new Vector3(0, 1.15, 0)).add(world.position);
      return { ...project(v), depth: camera.position.distanceTo(v) };
    },
    plots: plots.length,
    focus(id) {
      if (id === chosen) return;
      chosen = id;
      const e = id ? byId.get(id) : undefined;
      if (e) {
        // Looked at from a little below their middle, so they stand in the upper part of the view: the card
        // that opens with them takes the bottom of the screen.
        const target = worldPos(e).add(new Vector3(0, -0.55, 0));
        // From the outside, facing them, so the hill and the village never stand in between.
        const out = new Vector3(e.spot.x, 0, e.spot.z);
        const away = out.length() > 0.5 ? out.normalize() : camera.position.clone().sub(target).setY(0).normalize();
        if (options.visit === "video") {
          const aim = worldPos(e).add(new Vector3(0, e.spot.person.plan === "maker" ? 0.45 : 0.1, 0));
          fly([aim, aim.clone().add(sideOf(e).multiplyScalar(6.6 + e.spot.size * 1.6)).add(new Vector3(0, 2.7 + e.spot.size * 0.6, 0))]);
        } else if (e.spot.person.plan === "maker") {
          // Noor with her house: far enough back to see both, the device standing behind her.
          const mid = target.clone().add(new Vector3(0, 0.55, -1.1));
          fly([mid, mid.clone().add(new Vector3(0, 3.1, 8.2))]);
        } else {
          // A little above them, looking down over the neighbours, so no one stands in between.
          fly([target, target.clone().add(away.multiplyScalar(2.9 + e.spot.size)).add(new Vector3(0, 2.4 + e.spot.size * 0.6, 0))]);
        }
        // It jumps as the camera arrives.
        if (reduced) e.c.jump(1, 0.7);
        else due.push({ at: clock + 1.1, run: () => e.c.jump(1, 0.7) });
      } else {
        fly([overview.target.clone(), overview.position.clone()]);
      }
    },
    zoom(step) {
      const dir = camera.position.clone().sub(controls.target);
      const d = Math.min(controls.maxDistance, Math.max(controls.minDistance, dir.length() * (step > 0 ? 0.78 : 1.28)));
      fly([controls.target.clone(), controls.target.clone().add(dir.setLength(d))]);
    },
    pause(p) {
      paused = p;
    },
    light(ids, h) {
      lit = ids;
      hover = h;
    },
    onFrame: null,
    advance(dt) {
      frame(dt);
    },
    lift(share) {
      raised = share;
      resize();
    },
    startFacing(id, seconds) {
      const e = byId.get(id);
      if (!e) return;
      const side = sideOf(e);
      const theta = Math.atan2(side.x, side.z);
      // The auto-turn takes the camera's angle down by 2π/60 × speed a second (OrbitControls).
      const start = theta + ((2 * Math.PI) / 60) * controls.autoRotateSpeed * seconds;
      const off = camera.position.clone().sub(controls.target);
      const r = Math.hypot(off.x, off.z);
      camera.position.set(controls.target.x + Math.sin(start) * r, camera.position.y, controls.target.z + Math.cos(start) * r);
    },
    preview(who, come = true) {
      if (!who) {
        if (!you?.shown) return;
        you.shown = false;
        claims[you.plot]!.ghost.visible = true;
        fly([overview.target.clone(), overview.position.clone()]);
        return;
      }
      if (!you) {
        const c = new Creature3D(model, echoMarble(accent, highlight, pressed), face, shadowTex);
        c.setOutline(null);
        c.root.children[0]!.visible = false;
        c.root.traverse((n) => {
          if ((n as Mesh).isMesh && n !== c.root.children[0]) (n as Mesh).castShadow = true;
        });
        c.visible = false;
        world.add(c.root);
        you = { c, plot: -1, shown: false, wait: 0, fall: 0, v: 0 };
      }
      // Their own shade and finish, as their Echo would have them on the island.
      you.c.setSkin(skinOf(who, accent, brand));
      you.c.material.iridescenceThicknessRange = thinFilm(who);
      const plot = yours(who.plan);
      if (you.shown && plot === you.plot) return;
      if (you.shown) claims[you.plot]!.ghost.visible = true;
      you.plot = plot;
      you.shown = true;
      // The plot's ghost is theirs now; its beam stays on them.
      claims[plot]!.ghost.visible = false;
      const p = plots[plot]!;
      // It drops in as the camera arrives, seen from the side the house's lit screen stands behind it.
      you.wait = reduced ? 0 : 0.85;
      you.fall = reduced ? 0 : 4.5;
      you.v = 0;
      if (!come) return;
      // Far enough back to see where they've landed: their neighbours, Noor and her house behind them.
      const aim = new Vector3(p.x * 0.8, land.height(p.x, p.z) + p.size * 0.9, p.z * 0.8 + HOME_Z * 0.2).add(world.position);
      fly([aim, aim.clone().add(videoSide(p).multiplyScalar(13.5 + p.size * 2)).add(new Vector3(0, 6.2 + p.size * 0.6, 0))]);
    },
    yours,
    youLabel() {
      if (!you?.c.visible) return null;
      const p = plots[you.plot]!;
      return project(new Vector3(p.x, youY() + p.size * 0.62, p.z).add(world.position));
    },
    cheer() {
      if (you?.c.visible && you.fall === 0) you.c.jump(2, 1);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      seen?.disconnect();
      controls.dispose();
      echoes.forEach((e) => e.c.dispose());
      you?.c.dispose();
      scene.traverse((n) => {
        const mesh = n as Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mat = mesh.material;
          (Array.isArray(mat) ? mat : [mat]).forEach((x) => x?.dispose());
        }
      });
      renderer.dispose();
    },
  };

  function frame(dt: number) {
    if (!reduced) time += dt;
    clock += dt;
    for (let i = due.length - 1; i >= 0; i--) {
      if (due[i]!.at <= clock) due.splice(i, 1)[0]!.run();
    }

    if (flight) {
      flight.t = Math.min(1, flight.t + dt / 1.5);
      const k = flight.t < 0.5 ? 4 * flight.t ** 3 : 1 - (-2 * flight.t + 2) ** 3 / 2;
      controls.target.lerpVectors(flight.from[0], flight.to[0], k);
      camera.position.lerpVectors(flight.from[1], flight.to[1], k);
      if (flight.t >= 1) flight = null;
    }
    controls.enabled = !flight;
    controls.autoRotate = !reduced && !paused && !chosen && !hover && lit.size === 0 && !flight && !you?.shown;
    controls.update(dt);

    world.position.y = reduced ? 0 : Math.sin(time * 0.35) * 0.12;
    rocks.forEach((k) => {
      const a = k.a + time * k.speed;
      k.mesh.position.set(Math.cos(a) * k.r, k.y + Math.sin(time * 0.5 + k.a) * 0.25 + world.position.y, Math.sin(a) * k.r);
      k.mesh.rotation.y = time * k.speed * 3;
    });

    placeMotes();
    for (const cl of claims) {
      const t = time + cl.phase;
      const cam = camera.position;
      cl.ghost.rotation.y = Math.atan2(cam.x - cl.group.position.x, cam.z - cl.group.position.z);
      cl.ghostMat.opacity = reduced ? 0.4 : 0.3 + 0.16 * (0.5 + 0.5 * Math.sin(t * 2.4));
      cl.ghost.position.y = 0.4 + (reduced ? 0 : Math.sin(t * 1.2) * 0.05);
      const out = reduced ? 0.4 : (t * 0.45) % 1;
      cl.ring.scale.setScalar(1 + out * 1.6);
      cl.ringMat.opacity = 0.6 * (1 - out);
    }
    for (const e of echoes) {
      const id = e.spot.person.id;
      const up = id === chosen || id === hover || lit.has(id);
      e.grow += ((up ? 1.18 : 1) - e.grow) * Math.min(1, dt * 10);
      const size = e.spot.size * e.grow;
      const y = land.height(e.spot.x, e.spot.z) + size * 0.47;
      const cam = camera.position;
      const faceTo = Math.atan2(cam.x - e.spot.x, cam.z - e.spot.z) + (id === chosen ? 0 : e.spot.turn);
      // The pointer straight ahead of it: it looks at you.
      e.c.update(dt, { x: e.spot.x, y: -y, z: e.spot.z, size, face: faceTo }, { x: e.spot.x, y: -y }, reduced);
    }

    if (you) {
      const p = plots[you.plot];
      you.wait = Math.max(0, you.wait - dt);
      you.c.visible = you.shown && you.wait === 0;
      if (p && you.c.visible) {
        // Falling, then the give of landing, then a jump to say hello.
        if (you.fall > 0) {
          you.v -= 24 * dt;
          you.fall = Math.max(0, you.fall + you.v * dt);
          if (you.fall === 0) {
            you.c.land(Math.min(1, -you.v / 10));
            due.push({ at: clock + 0.4, run: () => you?.c.jump(1, 0.7) });
          }
        }
        const y = youY();
        const cam = camera.position;
        you.c.update(
          dt,
          { x: p.x, y: -y, z: p.z, size: p.size, face: Math.atan2(cam.x - p.x, cam.z - p.z), air: Math.min(1, you.fall / 2) },
          { x: p.x, y: -y },
          reduced,
        );
      }
    }

    renderer.render(scene, camera);
    api.onFrame?.();
  }

  const tick = (now: number) => {
    frame(Math.min(0.05, (now - last) / 1000));
    last = now;
    raf = requestAnimationFrame(tick);
  };
  // Drawn while it's on screen: scrolled away, it rests.
  const seen = options.manual
    ? null
    : new IntersectionObserver(([entry]) => {
        cancelAnimationFrame(raf);
        if (entry?.isIntersecting) {
          last = performance.now();
          raf = requestAnimationFrame(tick);
        }
      });
  seen?.observe(canvas);
  if (!options.manual) raf = requestAnimationFrame(tick);
  return api;
}
