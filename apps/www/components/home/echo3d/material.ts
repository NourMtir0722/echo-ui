/**
 * What a 3D creature is made of: glazed vinyl, with its face printed on.
 *
 * The body is a soft-touch shell with a fine pebbled grain, under a clear,
 * glossy coat, like a designer toy. Three.js lights the coat from the
 * surface as it is, smooth, and the colour underneath from the grain, so
 * the highlights stay crisp and the pebbling shows only where the light
 * rakes across it.
 *
 * Through the shell runs a marble: three tones of the creature's colour
 * folded by noise, a vein of a neighbouring hue swirled through, a scatter
 * of flecks, lighter where the key light falls from above and deeper
 * underneath, the way the flat Echo's gradient runs.
 *
 * The eyes are printed, not stuck on: the canonical whites, pupils and
 * catch-lights, drawn from the same paths as every other Echo into a small
 * mask (eyeMask), projected onto the front and painted into the base
 * colour. So they sit flush and can never come apart from the face. A
 * blink squeezes the print toward the eye line, a look slides the pupils
 * and their catch-lights across the whites, and the print is glossier
 * than the shell and has no grain.
 */
import { CanvasTexture, Color, LinearMipmapLinearFilter, MeshPhysicalMaterial, NoColorSpace, Vector2, Vector4 } from "three";
import {
  ECHO_EYE_CATCH,
  ECHO_EYE_CY,
  ECHO_EYE_WHITE_L,
  ECHO_EYE_WHITE_R,
  ECHO_PUPIL_L,
  ECHO_PUPIL_R,
} from "@registry/echo/creature/character";
import type { Marble } from "./palette";

/** The model's position, and its axes as the camera sees them. */
const AXES = /* glsl */ `
varying vec3 vEchoPos;
varying vec3 vEchoAxisX;
varying vec3 vEchoAxisY;
varying vec3 vEchoAxisZ;
`;

const NOISE = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uLight;
uniform vec3 uDeep;
uniform vec3 uVein;
uniform float uVeins;
uniform float uGrain;
uniform float uTime;
uniform sampler2D uEyes;
uniform vec4 uEyeBox;
uniform float uEyeLine;
uniform float uLids;
uniform vec2 uLook;
uniform vec3 uWhite;
uniform vec3 uPupil;
uniform float uSkin;
uniform vec3 uSkinA;
uniform vec3 uSkinB;
uniform vec3 uSkinC;
uniform vec3 uRim;
uniform float uRimAmt;
uniform float uGlow;
uniform float uSpeck;
uniform float uInkAmt;
uniform vec3 uInk;

float echoHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 echoHash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float echoNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(echoHash(i), echoHash(i + vec3(1, 0, 0)), f.x), mix(echoHash(i + vec3(0, 1, 0)), echoHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(echoHash(i + vec3(0, 0, 1)), echoHash(i + vec3(1, 0, 1)), f.x), mix(echoHash(i + vec3(0, 1, 1)), echoHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float echoFbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * echoNoise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}
/** Distance to the nearest of a scatter of points: rounded cells, the pebbles of the grain. */
float echoCells(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  float d = 8.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int k = -1; k <= 1; k++) {
    vec3 g = vec3(float(k), float(y), float(z));
    vec3 r = g + echoHash3(i + g) * 0.85 - f;
    d = min(d, dot(r, r));
  }
  return sqrt(d);
}
`;

const PAINT = /* glsl */ `
float echoFace = 0.0;
{
  // --- the marble -----------------------------------------------------------
  vec3 p = vEchoPos * 1.35 + uGrain;
  vec3 q = vec3(echoFbm(p), echoFbm(p + vec3(5.2, 1.3, 7.1)), echoFbm(p + vec3(2.9, 8.3, 1.7)));
  float n = echoFbm(p + 2.2 * q + vec3(0.0, uTime * 0.04, 0.0));
  float v = echoFbm(p * 1.4 + 2.8 * q.yzx);
  vec3 col = mix(uDeep, uBase, smoothstep(0.3, 0.48, n));
  col = mix(col, uLight, smoothstep(0.54, 0.72, n) * 0.9);
  col = mix(col, uVein, smoothstep(0.47, 0.6, v) * uVeins);
  // Flecks: small drops of the vein and the light colour, caught in the swirl.
  float fleck = echoNoise(vEchoPos * 30.0 + q * 3.0);
  col = mix(col, mix(uVein, uLight, step(0.5, q.x)), smoothstep(0.87, 0.9, fleck) * 0.45);
  // The key light is above: lighter on top, deeper underneath.
  col = mix(col, uLight, smoothstep(0.1, 1.0, vEchoPos.y) * 0.2);
  col = mix(col, uDeep, smoothstep(-0.1, -1.0, vEchoPos.y) * 0.3);

  // --- a skin: the body runs through several hues of the family (skins.ts) --
  if (uSkin > 0.5) {
    // Across the body from the top left, the way the key light falls.
    float t = clamp(0.5 + 0.62 * dot(vEchoPos, normalize(vec3(0.6, -0.78, 0.2))), 0.0, 1.0);
    // The bands bend with the swirl.
    t = clamp(t + (n - 0.5) * 1.1, 0.0, 1.0);
    vec3 g = t < 0.5 ? mix(uSkinA, uSkinB, smoothstep(0.0, 0.5, t)) : mix(uSkinB, uSkinC, smoothstep(0.5, 1.0, t));
    // A little of the marble's depth left in it, so it's a material, not a fill.
    g *= 0.9 + 0.22 * smoothstep(0.3, 0.7, n);
    col = g;
    // Speckles in the coat: drops of the rim's hue and of white.
    float sp = echoNoise(vEchoPos * 17.0 + 3.1);
    float sp2 = echoNoise(vEchoPos * 23.0 + 9.7);
    col = mix(col, uRim, smoothstep(0.83, 0.87, sp) * uSpeck);
    col = mix(col, vec3(1.0), smoothstep(0.86, 0.9, sp2) * uSpeck * 0.85);
    col = mix(col, col * 1.12 + 0.04, smoothstep(0.1, 1.0, vEchoPos.y) * 0.3);
  }

  // --- the printed face -----------------------------------------------------
  // Only on the front, and squeezed toward the eye line when it blinks.
  float front = smoothstep(0.05, 0.25, vEchoPos.z);
  vec2 e = vec2(vEchoPos.x, uEyeLine + (vEchoPos.y - uEyeLine) / max(uLids, 0.04));
  vec2 uvW = (e - uEyeBox.xy) / uEyeBox.zw;
  vec2 uvP = (e - uLook - uEyeBox.xy) / uEyeBox.zw;
  float inW = step(0.0, uvW.x) * step(uvW.x, 1.0) * step(0.0, uvW.y) * step(uvW.y, 1.0);
  float inP = step(0.0, uvP.x) * step(uvP.x, 1.0) * step(0.0, uvP.y) * step(uvP.y, 1.0);
  float white = texture2D(uEyes, uvW).r * inW * front;
  vec3 pp = texture2D(uEyes, uvP).rgb * inP;
  // The pupil stays on the white, however far it looks.
  float pupil = min(pp.g, white);
  float glint = min(pp.b, pupil);
  // Printed on a curve under a top light: the white a touch shaded toward its top edge.
  float up = clamp((vEchoPos.y - uEyeLine) / (uEyeBox.w * 0.5), -1.0, 1.0);
  vec3 whiteCol = uWhite * (0.97 - 0.1 * smoothstep(0.2, 1.0, up));
  col = mix(col, whiteCol, white);
  col = mix(col, uPupil, pupil);
  col = mix(col, vec3(1.0), glint * 0.95);
  echoFace = white;

  diffuseColor.rgb = col;
}
`;

/** A skin's rim light, in the contrast hue, and its soft edge glow: brightest where the body turns away. */
const RIM = /* glsl */ `
if (uSkin > 0.5) {
  vec3 viewDir = normalize(vViewPosition);
  float edge = 1.0 - clamp(abs(dot(normal, viewDir)), 0.0, 1.0);
  totalEmissiveRadiance += uRim * (pow(edge, 3.0) * uRimAmt + pow(edge, 1.4) * uGlow) * (1.0 - echoFace);
}
// A drawn look: an ink line where the body turns away from you, as a pen draws its outline.
if (uInkAmt > 0.0) {
  float inkEdge = 1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
  float inkLine = smoothstep(0.42, 0.56, inkEdge) * uInkAmt * (1.0 - echoFace);
  diffuseColor.rgb = mix(diffuseColor.rgb, uInk, inkLine);
  totalEmissiveRadiance *= 1.0 - inkLine;
}
`;

/** The printed face is glossier than the shell. */
const GLAZE = /* glsl */ `
roughnessFactor = mix(roughnessFactor, 0.42, echoFace);
`;

/** ...and the coat over it thinner, so a highlight never washes out an eye. */
const COAT = /* glsl */ `
#ifdef USE_CLEARCOAT
material.clearcoat *= 1.0 - 0.85 * echoFace;
#endif
`;

/** The grain's pebbles: a rounded dome on each cell. */
const PEBBLE = /* glsl */ `
float echoPebble(vec3 p) {
  return 1.0 - smoothstep(0.0, 0.62, echoCells(p));
}
`;

/**
 * The grain as a bump, worked out on the body itself rather than on the
 * screen: the height's slope along the model's own axes, turned into the
 * view. So it's the same grain at any size, with no stepping, and it fades
 * out where the pebbles would be finer than a pixel. None on the face.
 */
const GRAIN = /* glsl */ `
{
  const float F = 34.0;
  const float E = 0.14;
  vec3 P = vEchoPos * F;
  float h0 = echoPebble(P);
  vec3 g = vec3(echoPebble(P + vec3(E, 0.0, 0.0)), echoPebble(P + vec3(0.0, E, 0.0)), echoPebble(P + vec3(0.0, 0.0, E))) - h0;
  g *= F / E;
  vec3 gv = g.x * vEchoAxisX + g.y * vEchoAxisY + g.z * vEchoAxisZ;
  gv -= dot(gv, normal) * normal;
  float fine = clamp(1.6 - length(fwidth(vEchoPos)) * F * 2.2, 0.0, 1.0);
  normal = normalize(normal - 0.0032 * fine * (1.0 - echoFace) * gv);
}
`;

// --- the face mask ----------------------------------------------------------------

/** The part of the drawing the eyes are in, in its own units (viewBox 102.5 4 56 56), with room to blink and look. */
const FACE = { x0: 115, x1: 144, y0: 23.5, y1: 40.5 } as const;
/** Mask pixels per drawing unit. */
const PX = 36;

/** How the model maps back onto the drawing: written into echo.glb by the Blender script. */
export interface DrawingMap {
  /** The drawing point at the model's origin. */
  centre: readonly [number, number];
  /** Model units per drawing unit. */
  scale: number;
}

/** A drawing point in the model's space (y up). */
const toModel = (map: DrawingMap, x: number, y: number) => [(x - map.centre[0]) * map.scale, -(y - map.centre[1]) * map.scale] as const;

/**
 * The eyes as a mask, one part per channel: red the whites, green the
 * pupils, blue the catch-lights, drawn from Echo's own paths.
 */
export function eyeMask(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = Math.round((FACE.x1 - FACE.x0) * PX);
  c.height = Math.round((FACE.y1 - FACE.y0) * PX);
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  g.setTransform(PX, 0, 0, PX, -FACE.x0 * PX, -FACE.y0 * PX);
  g.globalCompositeOperation = "lighter";
  g.fillStyle = "#f00";
  g.fill(new Path2D(ECHO_EYE_WHITE_L));
  g.fill(new Path2D(ECHO_EYE_WHITE_R));
  g.fillStyle = "#0f0";
  g.fill(new Path2D(ECHO_PUPIL_L));
  g.fill(new Path2D(ECHO_PUPIL_R));
  g.fillStyle = "#00f";
  for (const [x, y] of ECHO_EYE_CATCH) {
    g.beginPath();
    g.arc(x, y, 0.62, 0, Math.PI * 2);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.anisotropy = 4;
  return t;
}

/** How far the pupils can travel on the whites, in drawing units: left and right, up and down. */
export const LOOK = { left: -4.8, right: 0, up: -1.7, down: 1 } as const;

/** Uniforms every creature shares: the mask, where it goes, and the eye colours. */
export function faceUniforms(map: DrawingMap, mask: CanvasTexture, white: string, pupil: string) {
  const [x0, y1] = toModel(map, FACE.x0, FACE.y1);
  return {
    uEyes: { value: mask },
    uEyeBox: { value: new Vector4(x0, y1, (FACE.x1 - FACE.x0) * map.scale, (FACE.y1 - FACE.y0) * map.scale) },
    uEyeLine: { value: toModel(map, 0, ECHO_EYE_CY)[1] },
    uWhite: { value: new Color(white) },
    uPupil: { value: new Color(pupil) },
  };
}
export type FaceUniforms = ReturnType<typeof faceUniforms>;

export interface BodyUniforms {
  uBase: { value: Color };
  uLight: { value: Color };
  uDeep: { value: Color };
  uVein: { value: Color };
  uVeins: { value: number };
  uGrain: { value: number };
  uTime: { value: number };
  /** 1 open, toward 0 shut. */
  uLids: { value: number };
  /** Where the pupils have moved to, in model units. */
  uLook: { value: Vector2 };
  /** 0: the plain marble. 1: the skin (skins.ts). */
  uSkin: { value: number };
  uSkinA: { value: Color };
  uSkinB: { value: Color };
  uSkinC: { value: Color };
  uRim: { value: Color };
  uRimAmt: { value: number };
  uGlow: { value: number };
  uSpeck: { value: number };
  /** A drawn look's ink line round the silhouette (0: none), and its ink. */
  uInkAmt: { value: number };
  uInk: { value: Color };
}

export function bodyMaterial(marble: Marble, face: FaceUniforms): { material: MeshPhysicalMaterial; uniforms: BodyUniforms } {
  const uniforms: BodyUniforms = {
    uBase: { value: new Color(marble.base) },
    uLight: { value: new Color(marble.light) },
    uDeep: { value: new Color(marble.deep) },
    uVein: { value: new Color(marble.vein) },
    uVeins: { value: marble.veins },
    uGrain: { value: marble.grain },
    uTime: { value: 0 },
    uLids: { value: 1 },
    uLook: { value: new Vector2() },
    uSkin: { value: 0 },
    uSkinA: { value: new Color(marble.light) },
    uSkinB: { value: new Color(marble.base) },
    uSkinC: { value: new Color(marble.deep) },
    uRim: { value: new Color(marble.vein) },
    uRimAmt: { value: 0 },
    uGlow: { value: 0 },
    uSpeck: { value: 0 },
    uInkAmt: { value: 0 },
    uInk: { value: new Color("#050505") },
  };
  const material = new MeshPhysicalMaterial({
    roughness: 0.55,
    clearcoat: 0.9,
    clearcoatRoughness: 0.14,
    sheen: 0.6,
    sheenRoughness: 0.5,
    sheenColor: new Color(marble.light),
    iridescence: 0.12,
    iridescenceIOR: 1.3,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, face, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${AXES}`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEchoPos = position;")
      .replace(
        "#include <defaultnormal_vertex>",
        "#include <defaultnormal_vertex>\nvEchoAxisX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));\nvEchoAxisY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));\nvEchoAxisZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${AXES}\n${NOISE}\n${PEBBLE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${PAINT}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n${GLAZE}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${GRAIN}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${RIM}`)
      .replace("#include <lights_physical_fragment>", `#include <lights_physical_fragment>\n${COAT}`);
  };
  material.customProgramCacheKey = () => "echo-body";
  return { material, uniforms };
}

/** A marble's colours as three's, converted once rather than every frame. */
export interface MarbleColours {
  base: Color;
  light: Color;
  deep: Color;
  vein: Color;
  veins: number;
}

export const marbleColours = (m: Marble): MarbleColours => ({
  base: new Color(m.base),
  light: new Color(m.light),
  deep: new Color(m.deep),
  vein: new Color(m.vein),
  veins: m.veins,
});

/** Moves a body's colours `t` of the way to `to`: a reseed washes over it, it doesn't snap. */
export function blendMarble(uniforms: BodyUniforms, sheen: Color, to: MarbleColours, t: number) {
  uniforms.uBase.value.lerp(to.base, t);
  uniforms.uLight.value.lerp(to.light, t);
  uniforms.uDeep.value.lerp(to.deep, t);
  uniforms.uVein.value.lerp(to.vein, t);
  uniforms.uVeins.value += (to.veins - uniforms.uVeins.value) * t;
  sheen.lerp(to.light, t);
}
