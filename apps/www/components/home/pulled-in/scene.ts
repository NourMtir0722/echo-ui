/**
 * The world Echo is pulled through: one three.js scene behind the stage, seen
 * through a lens, drawn by the scroll (timeline.ts), by how fast it's moving
 * and by a slow clock, so a stop at rest still breathes.
 *
 *   - The sky: the landing's own light (the six shades the page's light is
 *     made of, look.ts, from the site's colour), deep at the edges and glowing
 *     toward a white light far ahead, with soft rays out of it. Through it, a
 *     vortex: streaks of air spiralling into the light, turning as you go (and
 *     slowly while you rest), brighter the faster you scroll. The light grows
 *     until it floods everything white. The white doesn't stay a blank page:
 *     it's an off-white with a grain, and the vortex's light settles into a
 *     soft, wide glow pooled low behind the key, breathing slowly. Its top and
 *     bottom are the plain off-white, the page's own while the white goes on
 *     (WhiteRun.tsx), so the stage scrolls on without an edge.
 *   - The lens: a fish-eye (the middle near, the edges bent away), a zoom
 *     blur toward the light and a split of colour at the edges that grow with
 *     the speed, a film grain, and the stage's top and bottom eased into the
 *     page's own dark as it slides in, so it never has an edge.
 *
 * Nothing flies in it but Echo, drawn by the page's own 3D stage over it
 * (PulledIn.tsx docks it). OpenAI's mark is never in here: it stays flat, in
 * the page.
 */
import { Color, Mesh, NoToneMapping, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { camZ, clamp, light, lens } from "./timeline";

export const FOV = 50;
const FAR_SCREEN = 120;
const TAN = Math.tan((FOV * Math.PI) / 360);

export interface Colours {
  /** The page's ground, behind the stage. */
  ground: string;
  /** The landing's light: six shades of the site's colour, deep to glow (shades.ts). */
  sky: string[];
  /** The white it floods into. */
  white: string;
  /** The off-white the world settles into (WhiteRun.tsx's ground, the same). */
  paper: string;
}

/**
 * A point in the world. Plain, so the page can hold one without loading three.js: the scene is a chunk of its
 * own, and the page's first load stays without it.
 */
export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface PullScene {
  resize(w: number, h: number): void;
  /**
   * Draw for the moment, in windows (`u`, timeline.ts), how fast it's moving (`speed`, 0 at rest), the clock (`t`, s:
   * the storm turns and the white breathes at rest), and where the scroll has the stage (`scrolled`: its edges).
   */
  draw(u: number, speed: number, t: number, scrolled?: number): void;
  /** A world point on the stage, px, and how far in front of the camera it is (≤ 0: behind). */
  project(v: Point): { x: number; y: number; depth: number };
  /** The size of a world unit at `depth` in front of the camera, px. */
  unitAt(depth: number): number;
  destroy(): void;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const SKY = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uAspect;
uniform float uOpen;
uniform float uCore;
uniform float uSpin;
uniform float uAir;
uniform float uWorld;
uniform vec3 uGround;
uniform vec3 uSky[6];
uniform vec3 uWhite;
uniform vec3 uPaper;
uniform float uTime;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// The landing's light, from its deep (0) to its glow (1).
vec3 shade(float t) {
  float s = clamp(t, 0.0, 1.0) * 5.0;
  int i = int(floor(s));
  if (i >= 5) return uSky[5];
  return mix(uSky[i], uSky[i + 1], fract(s));
}

void main() {
  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(q);
  float a = atan(q.y, q.x);
  float L = log(max(r, 1e-3));
  // The direction from the middle, for noise that has no seam where the angle wraps round.
  vec2 dir = q / max(r, 1e-3);

  // The blue, deep at the edges and glowing toward the light; the vortex twists it a little.
  float twist = (noise(dir * 1.6 + vec2(L * 1.4 - uSpin * 0.7, L * 2.0)) - 0.5) * 0.16;
  vec3 sky = shade(1.0 - smoothstep(0.0, 0.78, r) + twist);
  // How far it has opened: at the first stop only the middle, the page's dark round it.
  float R = mix(0.22, 2.0, uOpen);
  float blue = smoothstep(R, R * 0.25, r);
  vec3 col = mix(uGround, sky, blue);

  // Soft light falling out of the middle.
  float rays = pow(0.5 + 0.5 * sin(a * 7.0 + (noise(dir * 3.0 + 2.0) - 0.5) * 4.0), 10.0);
  col = mix(col, uWhite, rays * 0.16 * blue * smoothstep(1.1, 0.05, r));

  // The vortex: streaks of air spiralling into the light.
  float air = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float arms = 4.0 + fi * 2.0;
    float tw = 1.5 + fi * 0.55;
    float s = fract(a / 6.28318 * arms + L * tw + uSpin * (1.0 + fi * 0.45));
    float w = 0.012 + 0.01 * fi;
    float line = smoothstep(0.0, w, s) * (1.0 - smoothstep(w, w * 5.0, s));
    float dash = smoothstep(0.42, 0.78, noise(dir * arms * 1.4 + vec2(fi * 13.0, L * 4.0 - uSpin * 2.5)));
    float band = smoothstep(0.05, 0.24, r) * (1.0 - smoothstep(0.85, 1.6, r));
    air += line * dash * band * (0.6 - fi * 0.13);
  }
  col = mix(col, uWhite, clamp(air * (0.22 + 0.78 * uAir), 0.0, 1.0) * blue);

  // The white light ahead, growing until it floods.
  float core = exp(-pow(r / max(uCore, 1e-3), 2.0));
  float halo = exp(-pow(r / max(uCore * 2.6, 1e-3), 2.0)) * 0.3;
  col = mix(col, uWhite, clamp(core + halo * blue, 0.0, 1.0));

  // The white world: the off-white, and the light settled into a wide glow low behind the key, breathing.
  vec2 g = (q - vec2(0.0, -0.11)) / vec2(0.95, 0.24);
  float pool = exp(-dot(g, g)) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
  float breath = 0.86 + 0.14 * sin(uTime * 0.9);
  vec3 world = mix(uPaper, mix(uSky[5], uSky[4], 0.25), pool * 0.34 * breath);
  col = mix(col, world, uWorld);

  gl_FragColor = vec4(col, 1.0);
}
`;

const LENS = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 uRes;
uniform float uFish;
uniform float uBlur;
uniform float uEdge;
uniform float uGrain;
uniform vec3 uGround;
varying vec2 vUv;

void main() {
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 d = (vUv - 0.5) * asp;
  float r = length(d) / length(0.5 * asp);
  // Fish-eye: the middle magnified, the edges gathered in (corners still sample the corners).
  float f = (1.0 + uFish * r * r) / (1.0 + uFish);
  vec2 src = 0.5 + d * f / asp;
  // Speed: a zoom blur toward the light, and the colour splitting at the edges.
  vec2 toC = vec2(0.5) - src;
  float ca = 0.0035 * r * r * (1.0 + uBlur * 4.0);
  vec3 col = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float t = float(i) / 11.0;
    vec2 uv = src + toC * uBlur * r * 0.13 * t;
    vec2 off = (uv - 0.5) * ca;
    col.r += texture2D(tDiffuse, uv + off).r;
    col.g += texture2D(tDiffuse, uv).g;
    col.b += texture2D(tDiffuse, uv - off).b;
  }
  col /= 12.0;
  // A fine, still grain, like a print.
  float g = fract(sin(dot(floor(vUv * uRes), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col += g * uGrain;
  // The stage's top and bottom, eased into the page as it arrives and as it leaves.
  float e = max(smoothstep(0.24, 0.0, vUv.y), smoothstep(0.76, 1.0, vUv.y));
  col = mix(col, uGround, e * uEdge);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createPullScene(canvas: HTMLCanvasElement, colours: Colours, opts: { light: boolean }): PullScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  // No tone mapping: the sky's dark has to be the page's own, exactly, where they meet.
  renderer.toneMapping = NoToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.light ? 1.25 : 1.6));

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 400);

  // --- the sky ---------------------------------------------------------------------
  const plane = new PlaneGeometry(1, 1);
  const skyMat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: SKY,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uAspect: { value: 1 },
      uOpen: { value: 0 },
      uCore: { value: 0.05 },
      uSpin: { value: 0 },
      uAir: { value: 0 },
      uWorld: { value: 0 },
      uGround: { value: new Color(colours.ground) },
      uSky: { value: colours.sky.map((c) => new Color(c)) },
      uWhite: { value: new Color(colours.white) },
      uPaper: { value: new Color(colours.paper) },
      uTime: { value: 0 },
    },
  });
  const backdrop = new Mesh(plane, skyMat);
  backdrop.frustumCulled = false;
  scene.add(backdrop);

  // --- the lens ------------------------------------------------------------------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());
  const groundSrgb = new Vector3(...new Color(colours.ground).convertLinearToSRGB().toArray());
  const lensPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new Vector2(1, 1) },
      uFish: { value: 0 },
      uBlur: { value: 0 },
      uEdge: { value: 1 },
      uGrain: { value: 0.045 },
      uGround: { value: groundSrgb },
    },
    vertexShader: VERT,
    fragmentShader: LENS,
  });
  composer.addPass(lensPass);

  let w = 1;
  let h = 1;
  const tmp = new Vector3();
  const unitAt = (depth: number) => h / (2 * depth * TAN);

  return {
    resize(nw, nh) {
      w = Math.max(1, nw);
      h = Math.max(1, nh);
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      skyMat.uniforms.uAspect!.value = w / h;
      lensPass.uniforms.uRes!.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    },
    project(v) {
      const depth = camera.position.z - v.z;
      tmp.set(v.x, v.y, v.z).project(camera);
      return { x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h, depth };
    },
    unitAt,
    draw(u, speed, t, scrolled = u) {
      const z = camZ(u);
      camera.position.set(0, 0, z);
      camera.lookAt(0, 0, z - 10);
      camera.updateMatrixWorld();

      const L = light(u);
      const k = skyMat.uniforms;
      k.uOpen!.value = L.open;
      k.uCore!.value = L.core;
      // The storm keeps turning while the scroll rests; the scroll turns it faster.
      k.uSpin!.value = L.spin + t * 0.05;
      k.uTime!.value = t;
      k.uAir!.value = clamp(speed * 1.6);
      k.uWorld!.value = L.world;
      const fh = 2 * FAR_SCREEN * TAN;
      backdrop.position.set(0, 0, z - FAR_SCREEN);
      backdrop.scale.set(fh * (w / h), fh, 1);

      const Lz = lens(u, scrolled);
      lensPass.uniforms.uFish!.value = Lz.fish;
      lensPass.uniforms.uBlur!.value = clamp(speed * 1.4) * Lz.flight;
      lensPass.uniforms.uEdge!.value = Lz.edge;

      composer.render();
    },
    destroy() {
      plane.dispose();
      skyMat.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
