"use client";

/**
 * A field of light: a smooth gradient in a few colours, drawn on its own
 * canvas and laid over the page's ground with alpha, so wherever it thins
 * out the ground shows through.
 *
 * Colour runs down the field through `stops` (top to bottom), its bands bent
 * gently by one or two very wide, slow waves (`size`, `bend`), with a fine,
 * still grain over it like a print (which also keeps it from banding).
 *
 * It moves with the scroll and only with it: the waves drift by how far the
 * page has scrolled (`drift`), so it's as smooth as the scroll and runs back
 * when you scroll back, and nothing moves on its own beside the text (WCAG
 * 2.2.2) but an arch rising into place once, as the page opens. It rises
 * into view as it comes up the window, like light coming up, also by the
 * scroll; and its host can move the light up or down inside it each frame
 * (`foot`): an arch rising into place, a light following the scroll. It draws on
 * the homepage's one frame (frame.ts), after the smooth scroll has moved the
 * page, so a light that moves with the scroll never trails it. Under reduced
 * motion it holds still, whole; with forced colours it isn't drawn (landing.css).
 *
 * Text over it always reads (contrast.ts). `guard` names the text that sits
 * on the field; every line of it is measured (its colour, and whether it's
 * large), and behind each line the light steps back along its own shades
 * toward the ground (darker on a dark device, paler on a light one) until
 * the line meets WCAG AA (AAA when the visitor asks for more contrast), with
 * a soft edge, so the field glows everywhere else at full strength. Echo's
 * light (lights.ts) is counted in, under the field or screened over it.
 * Whatever the parameters, the text wins. Without WebGL it's a CSS gradient,
 * faint where there's text on it.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { hexToOklch } from "echo-ui-core/theme";
import { MARGIN, moreContrast, needed, rgb, rgba, type Rgb } from "./contrast";
import { pool } from "./lights";
import { frozen } from "./LightPool";
import { onFrame } from "@/components/home/frame";

export interface ShaderProps {
  /** Its shades, deep to glow, as #rrggbb. Six, lightest last. */
  stops: readonly string[];
  /** How much of the field shows over the ground, 0..1. */
  amount: number;
  /** How far its waves drift for a window's height of scroll. */
  drift: number;
  /** How wide its waves are: bigger is smoother. */
  size: number;
  /** How much the waves bend the bands, 0 (straight) to 1. */
  bend: number;
  /** How far the light climbs the sides, low down: 0 is level. */
  bow: number;
  /** How much of the field's height the light rises through, from the bottom, 0..1. */
  glow: number;
  grain: number;
  /** Where it fades out at the top and bottom, as shares of its height. */
  fade?: [top: number, bottom: number];
  /** A selector for the text that sits on the field, kept readable over it. */
  guard?: string;
  /** "field": light rising through the whole field. "arch": half an ellipse of light on its bottom edge. */
  shape?: "field" | "arch";
  /** Told once, when it has first drawn (the hero hands over from its stand-in then). */
  onDrawn?: () => void;
  /** The arch's roundness (its half-width over its height: 1 is half a circle) and its height, as a share of the field's. */
  arch?: [roundness: number, height: number];
  /** How soft the arch's rim is, as a share of its size. */
  edge?: number;
  /**
   * How far the light sits below its place, CSS px (negative: above it), read every frame: an arch's foot
   * below the bottom edge, a field's gradient lower down. The field's own edges and fades stay put.
   */
  foot?: () => number;
  /**
   * How it keeps that text readable. "rows": the gradient starts lower at the rows the text is at (a
   * field the light rises through). "lines": the light thins round each line back to the ground (a
   * field whose light pools in one place, kept away from the text).
   */
  guardBy?: "rows" | "lines";
  className?: string;
  style?: CSSProperties;
}

const MAX_BOXES = 16;
/** A colour as OKLab, where the gradient is blended. */
const oklab = (hex: string): [number, number, number] => {
  const { L, C, H } = hexToOklch(hex);
  const h = ((Number.isNaN(H) ? 0 : H) * Math.PI) / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
};
const luminanceOf = ([r, g, b]: Rgb) => 0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2;

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec3 uLab[6];
uniform float uAmt;
uniform float uSize;
uniform float uBend;
uniform float uBow;
uniform float uGlow;
uniform float uDrift;
uniform float uGrain;
uniform float uReveal;
uniform vec2 uFade;
uniform vec3 uGround;
uniform vec4 uBox[${MAX_BOXES}];
uniform vec3 uFg[${MAX_BOXES}];
uniform float uNeed[${MAX_BOXES}];
uniform float uBoxN;
uniform float uFeather;
uniform float uByRows;
uniform float uShape;
uniform vec2 uArch;
uniform float uEdge;
uniform float uFoot;
uniform float uShift;
uniform vec4 uPool;
uniform vec3 uPoolCol;
uniform float uPoolMode;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// 2D simplex noise: Ashima Arts and Stefan Gustavson (MIT), webgl-noise.
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
// The exact sRGB curve, for what WCAG measures.
float lin1(float c) { return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
float lum(vec3 s) { return 0.2126 * lin1(s.r) + 0.7152 * lin1(s.g) + 0.0722 * lin1(s.b); }
// The shades, deep to glow, blended in OKLab: even steps to the eye, no muddy middle.
vec3 rampLab(float k) {
  k = clamp(k, 0.0, 1.0) * 5.0;
  vec3 c = mix(uLab[0], uLab[1], clamp(k, 0.0, 1.0));
  c = mix(c, uLab[2], clamp(k - 1.0, 0.0, 1.0));
  c = mix(c, uLab[3], clamp(k - 2.0, 0.0, 1.0));
  c = mix(c, uLab[4], clamp(k - 3.0, 0.0, 1.0));
  c = mix(c, uLab[5], clamp(k - 4.0, 0.0, 1.0));
  return c;
}
vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
// A shade along the gradient (kk), with this pixel's grain g.
vec3 shadeAt(float kk, float g) { return toSrgb(max(oklabToLinear(rampLab(kk)), 0.0) * g); }
// The light Echo carries, here (lights.ts falloff): how strong, 0..1.
float poolAt(vec2 px) {
  if (uPoolMode < 0.5) return 0.0;
  float t = length(px - uPool.xy) / max(uPool.z, 1.0);
  float f = t < 0.42 ? 1.0 - 0.55 * t / 0.42 : (t < 1.0 ? 0.45 * (1.0 - (t - 0.42) / 0.58) : 0.0);
  return uPool.w * f;
}
vec3 screenOver(vec3 x, float a) { return x + a * uPoolCol * (1.0 - x); }
// What the text near here asks of the page behind it, as a luminance range: light text needs the
// ground under a ceiling, dark text over a floor. Near a line its full contrast; further off, less,
// down to nothing at the feather's edge. Worked out once a pixel; checking a shade is then one lum.
vec2 boundsAt(vec2 px, float pa) {
  float lo = 0.0;
  float hi = 1.0;
  float lg = lum(uGround);
  for (int i = 0; i < ${MAX_BOXES}; i++) {
    if (float(i) >= uBoxN) break;
    vec4 b = uBox[i];
    b.yw += uShift;
    // By rows: a line of text asks it of the whole width it sits at, so any deepening reads as the
    // gradient starting lower, never as a shape cut round the words. Or round the line itself, softly,
    // where the light only thins (a field whose light pools in one place).
    float d = uByRows > 0.5 ? max(max(b.y - px.y, px.y - b.w), 0.0) : length(max(max(b.xy - px, px - b.zw), 0.0));
    float w = 1.0 - smoothstep(0.0, uFeather, d);
    if (w <= 0.0) continue;
    float need = mix(1.0, uNeed[i], w);
    float lf = lum(uPoolMode > 1.5 ? screenOver(uFg[i], pa) : uFg[i]);
    if (lf >= lg) hi = min(hi, (lf + 0.05) / need - 0.05);
    else lo = max(lo, need * (lf + 0.05) - 0.05);
  }
  return vec2(lo, hi);
}
float shade(vec3 backdrop, vec3 col, float a, float pa) {
  vec3 bg = mix(backdrop, col, a);
  if (uPoolMode > 1.5) bg = screenOver(bg, pa);
  return lum(bg);
}
void main() {
  float aspect = uRes.x / max(uRes.y, 1.0);
  float x = vUv.x - 0.5;
  float y = vUv.y;
  vec2 p = vec2(vUv.x * aspect, vUv.y) / max(uSize, 0.1);
  // Two wide, slow waves, drifting with the scroll.
  float n = 0.7 * snoise(p * 0.7 + vec2(uDrift * 0.5, uDrift * 0.18)) + 0.3 * snoise(p * 1.3 + vec2(5.1 - uDrift * 0.3, 1.7 + uDrift * 0.4));
  // The light comes up from below and climbs the sides, low down: a bowl, gently waved; rising into
  // view as the field is revealed, and as far down as its host has moved it.
  float yl = y - uFoot / uRes.y;
  float lift = uBow * x * x * 4.0 * smoothstep(0.25, 1.0, yl);
  float rise = 1.0 - uReveal;
  float k = (yl + lift + n * 0.12 * uBend - (1.0 - uGlow) - rise * 0.6) / max(uGlow, 0.05);
  float a = uAmt * smoothstep(-0.5, 0.2, k);
  // Or an arch: half an ellipse of light standing on the bottom edge, its core at the bottom's middle,
  // deep at its rim, with a soft rim and a faint halo past it. It rises into view with the reveal.
  if (uShape > 0.5) {
    vec2 c = vUv * uRes;
    // Its height a share of the field's; its half-width that times its roundness (1: half a circle).
    float ry = max(uArch.y * uRes.y * mix(0.35, 1.0, uReveal), 1.0);
    // Where its foot is: on the bottom edge, or below it as it rises or sets.
    vec2 q = vec2((c.x - 0.5 * uRes.x) / (ry * uArch.x), (uRes.y + uFoot - c.y) / ry);
    float r = length(q);
    r += n * 0.025 * uBend;
    k = pow(1.0 - clamp(r, 0.0, 1.0), 0.75);
    a = uAmt * max(smoothstep(1.0 + uEdge, 1.0 - uEdge, r), 0.3 * smoothstep(1.0 + uEdge * 5.0, 1.0, r));
  }
  vec3 lab = rampLab(k);
  // Where the waves gather, the core of the light a touch brighter.
  lab.x = min(lab.x + 0.035 * n * smoothstep(0.35, 1.0, k), 0.99);
  // A fine grain, still, like a print, in the light itself, so the text's ceiling holds with it.
  float g = 1.0 + (hash(floor(gl_FragCoord.xy)) - 0.5) * 2.0 * uGrain;
  vec3 col = toSrgb(max(oklabToLinear(lab), 0.0) * g);
  // The field's own edges fade.
  a *= smoothstep(0.0, max(uFade.x, 0.001), y) * smoothstep(0.0, max(uFade.y, 0.001), 1.0 - y);
  a = clamp(a, 0.0, 1.0);
  // Text over it always reads: where it's too bright behind a line, the gradient starts lower there,
  // with Echo's light counted in (under the field when it's behind the page, screened over it when over).
  vec2 px = vUv * uRes;
  float pa = poolAt(px);
  vec3 backdrop = uPoolMode > 0.5 && uPoolMode < 1.5 ? mix(uGround, uPoolCol, pa) : uGround;
  if (uBoxN > 0.0) {
    vec2 bounds = boundsAt(px, pa);
    // Too bright for light text over it, or too dark for dark text: on either device the way back is
    // toward the ground.
    float l0 = shade(backdrop, col, a, pa);
    if (l0 > bounds.y || l0 < bounds.x) {
      float lo = 0.0;
      float hi = 1.0;
      if (uByRows > 0.5) {
        // Back along its own shades, as if the light started further down.
        for (int i = 0; i < 8; i++) {
          float m = 0.5 * (lo + hi);
          float l = shade(backdrop, shadeAt(k * m, g), a, pa);
          if (l > bounds.y || l < bounds.x) hi = m; else lo = m;
        }
        col = shadeAt(k * lo, g);
      }
      // And if that isn't enough (or round a line), the light thins back to the ground: the glow's own
      // edge, never a patch.
      float l1 = shade(backdrop, col, a, pa);
      if (l1 > bounds.y || l1 < bounds.x) {
        lo = 0.0;
        hi = 1.0;
        for (int i = 0; i < 8; i++) {
          float m = 0.5 * (lo + hi);
          float l = shade(backdrop, col, a * m, pa);
          if (l > bounds.y || l < bounds.x) hi = m; else lo = m;
        }
        a *= lo;
      }
    }
  }
  gl_FragColor = vec4(col * a, a);
}
`;

/** Drawn at the page's own CSS pixels: the gradient is soft, but the grain is fine. */
const RES = 1;
/**
 * How far from a line of text the light comes back to full, CSS px: wide by rows (the gradient starting
 * lower reads as one), tight round lines (only the light right by the words is held).
 */
const FEATHER = { rows: 240, lines: 60 } as const;

/** The colour the page is painted in behind `el`: the first ancestor that paints. */
function groundBehind(el: Element): Rgb {
  for (let a = el.parentElement; a; a = a.parentElement) {
    const [c, alpha] = rgba(getComputedStyle(a).backgroundColor);
    if (alpha > 0.95) return c;
  }
  return rgb(getComputedStyle(document.documentElement).getPropertyValue("--echo-surface").trim() || "#000");
}

interface Guarded {
  boxes: Float32Array;
  /** Each line's text colour, sRGB. */
  fgs: Float32Array;
  /** The contrast each line needs, with a margin. */
  needs: Float32Array;
  n: number;
}

const none = (): Guarded => ({ boxes: new Float32Array(MAX_BOXES * 4), fgs: new Float32Array(MAX_BOXES * 3), needs: new Float32Array(MAX_BOXES), n: 0 });

/** Every line of text under `selector`, in the canvas's pixels, with its colour and the contrast it needs. */
function measure(canvas: HTMLCanvasElement, selector: string): Guarded {
  const c = canvas.getBoundingClientRect();
  const lines: { x0: number; y0: number; x1: number; y1: number; fg: Rgb; need: number }[] = [];
  const more = moreContrast();
  for (const root of document.querySelectorAll(selector)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.nodeValue?.trim()) continue;
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") continue;
      const fg = rgb(s.color);
      // Twice the margin the light around Echo keeps: the field is grained, and laid under a screened light.
      const need = needed(el, s, more) + 2 * MARGIN;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue;
        const pad = 6;
        lines.push({ x0: (r.left - pad - c.left) * RES, y0: (r.top - pad - c.top) * RES, x1: (r.right + pad - c.left) * RES, y1: (r.bottom + pad - c.top) * RES, fg, need });
      }
    }
  }
  // More lines than the shader holds: the last ones merge into one box, keeping the dimmer text and the stricter need.
  while (lines.length > MAX_BOXES) {
    const b = lines.pop()!;
    const a = lines[lines.length - 1]!;
    const dim = luminanceOf(b.fg) < luminanceOf(a.fg) ? b.fg : a.fg;
    lines[lines.length - 1] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), fg: dim, need: Math.max(a.need, b.need) };
  }
  const g = none();
  lines.forEach((l, i) => {
    g.boxes.set([l.x0, l.y0, l.x1, l.y1], i * 4);
    g.fgs.set(l.fg, i * 3);
    g.needs[i] = l.need;
  });
  g.n = lines.length;
  return g;
}

export function ShaderField({ stops, amount, drift, size, bend, bow, glow, grain, fade = [0, 0], guard, guardBy = "rows", shape = "field", arch = [1, 0.5], edge = 0.1, foot, onDrawn, className, style }: ShaderProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [flat, setFlat] = useState(false);
  const [restart, setRestart] = useState(0);
  // Read every frame, so a slider moves it without starting it again.
  const live = useRef({ stops, amount, drift, size, bend, bow, glow, grain, fade, guard, guardBy, shape, arch, edge, foot, onDrawn });
  live.current = { stops, amount, drift, size, bend, bow, glow, grain, fade, guard, guardBy, shape, arch, edge, foot, onDrawn };

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      setFlat(true);
      return;
    }
    // A context lost (the GPU reset, or one given back): ask for it again, and start over once it's back.
    if (gl.isContextLost()) {
      const back = () => setRestart((n) => n + 1);
      el.addEventListener("webglcontextrestored", back, { once: true });
      gl.getExtension("WEBGL_lose_context")?.restoreContext();
      return () => el.removeEventListener("webglcontextrestored", back);
    }
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      // Say why, while drafting: a field that quietly fell back to its CSS gradient looks like a dim one.
      if (process.env.NODE_ENV !== "production") {
        for (const sh of gl.getAttachedShaders(prog) ?? []) console.error("ShaderField:", gl.getShaderInfoLog(sh));
        console.error("ShaderField:", gl.getProgramInfoLog(prog));
      }
      setFlat(true);
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u("uRes"),
      lab: u("uLab"),
      amt: u("uAmt"),
      size: u("uSize"),
      bend: u("uBend"),
      bow: u("uBow"),
      glow: u("uGlow"),
      drift: u("uDrift"),
      grain: u("uGrain"),
      reveal: u("uReveal"),
      fade: u("uFade"),
      ground: u("uGround"),
      box: u("uBox"),
      fg: u("uFg"),
      need: u("uNeed"),
      boxN: u("uBoxN"),
      feather: u("uFeather"),
      byRows: u("uByRows"),
      shape: u("uShape"),
      arch: u("uArch"),
      edge: u("uEdge"),
      foot: u("uFoot"),
      shift: u("uShift"),
      pool: u("uPool"),
      poolCol: u("uPoolCol"),
      poolMode: u("uPoolMode"),
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let shown = false;
    /** Its place on the homepage's frame, while it's on screen. */
    let stop: (() => void) | null = null;
    let lastY = Number.NaN;
    let told = false;
    /** Echo's light reached this field when it last moved. */
    let reached = false;
    let dirty = true;
    let guarded: Guarded = none();
    let poolSeen = -1;
    let ground: Rgb = [0, 0, 0];
    let measuredAt = 0;
    let footNow = 0;
    /** Where the guarded text was measured from: the page's scroll and the canvas's top, then. */
    let measuredFrom = { scroll: 0, top: 0 };

    const size = () => {
      const w = Math.max(1, Math.round(el.clientWidth * RES));
      const h = Math.max(1, Math.round(el.clientHeight * RES));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        dirty = true;
      }
      gl.viewport(0, 0, w, h);
    };
    const remeasure = () => {
      const g = live.current.guard;
      const next = g ? measure(el, g) : none();
      const nextGround = groundBehind(el);
      const moved = next.boxes.some((v, i) => Math.abs(v - guarded.boxes[i]!) > 0.5);
      const recoloured = next.fgs.some((v, i) => v !== guarded.fgs[i]) || next.needs.some((v, i) => v !== guarded.needs[i]);
      if (next.n !== guarded.n || moved || recoloured || nextGround.some((v, i) => v !== ground[i])) {
        guarded = next;
        ground = nextGround;
        measuredFrom = { scroll: window.scrollY, top: el.getBoundingClientRect().top };
        dirty = true;
      }
    };
    const draw = () => {
      const v = live.current;
      size();
      gl.uniform2f(U.res, el.width, el.height);
      gl.uniform3fv(U.lab, new Float32Array(v.stops.flatMap(oklab)));
      gl.uniform1f(U.amt, v.amount);
      gl.uniform1f(U.size, v.size);
      gl.uniform1f(U.bend, v.bend);
      gl.uniform1f(U.bow, v.bow);
      gl.uniform1f(U.glow, v.glow);
      gl.uniform1f(U.grain, v.grain);
      // By the scroll, and only by it: as far as the page has come, so it runs back when it goes back.
      const vh = window.innerHeight;
      gl.uniform1f(U.drift, reduced ? 0 : (window.scrollY / vh) * v.drift);
      const r = el.getBoundingClientRect();
      const rising = !reduced;
      const seen = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.8)));
      gl.uniform1f(U.reveal, rising ? seen * seen * (3 - 2 * seen) : 1);
      gl.uniform2f(U.fade, v.fade[0], v.fade[1]);
      gl.uniform3f(U.ground, ground[0], ground[1], ground[2]);
      gl.uniform4fv(U.box, guarded.boxes);
      gl.uniform3fv(U.fg, guarded.fgs);
      gl.uniform1fv(U.need, guarded.needs);
      gl.uniform1f(U.boxN, guarded.n);
      gl.uniform1f(U.feather, FEATHER[v.guardBy] * RES);
      gl.uniform1f(U.byRows, v.guardBy === "rows" ? 1 : 0);
      gl.uniform1f(U.shape, v.shape === "arch" ? 1 : 0);
      gl.uniform2f(U.arch, v.arch[0], v.arch[1]);
      gl.uniform1f(U.edge, v.edge);
      gl.uniform1f(U.foot, footNow * RES);
      // Echo's light, in the canvas's pixels.
      const c = el.getBoundingClientRect();
      // The text it guards scrolls with the page. A field its host moves against the page (the road's
      // follows the scroll) carries its lines along between measures; for one that doesn't, this is 0.
      gl.uniform1f(U.shift, (measuredFrom.scroll - window.scrollY + measuredFrom.top - c.top) * RES);
      gl.uniform4f(U.pool, (pool.x - c.left) * RES, (pool.y - c.top) * RES, pool.r * RES, pool.amount);
      gl.uniform3f(U.poolCol, pool.colour[0], pool.colour[1], pool.colour[2]);
      gl.uniform1f(U.poolMode, pool.mode === "behind" ? 1 : pool.mode === "over" ? 2 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      dirty = false;
      if (!told) {
        told = true;
        v.onDrawn?.();
      }
    };
    const tick = (now: number) => {
      if (frozen()) return;
      // The page scrolled: the waves drift and the rise moves on with it.
      const y = window.scrollY;
      if (y !== lastY) {
        lastY = y;
        if (!reduced) dirty = true;
      }
      // Its host moved the arch.
      const f = live.current.foot?.() ?? 0;
      if (f !== footNow) {
        footNow = f;
        dirty = true;
      }
      // The text it guards is measured again a few times a second: a reveal, a font, a resize moves it.
      if (now - measuredAt > 250) {
        measuredAt = now;
        remeasure();
      }
      // Echo's light moved over it: draw again, so the two never add up past what the text can take.
      if (pool.version !== poolSeen) {
        poolSeen = pool.version;
        if (guarded.n > 0 && pool.mode !== "off") {
          const c = el.getBoundingClientRect();
          const reaches = pool.x + pool.r > c.left && pool.x - pool.r < c.right && pool.y + pool.r > c.top && pool.y - pool.r < c.bottom;
          // While it reaches this field, and once more as it leaves, so its trace goes with it.
          if (reaches || reached) dirty = true;
          reached = reaches;
        }
      }
      if (dirty) draw();
    };
    const io = new IntersectionObserver(([e]) => {
      shown = !!e?.isIntersecting;
      if (shown && !stop) {
        lastY = Number.NaN;
        remeasure();
        dirty = true;
        stop = onFrame(tick);
      } else if (!shown && stop) {
        stop();
        stop = null;
      }
    });
    io.observe(el);
    const lost = (e: Event) => {
      e.preventDefault();
      stop?.();
      stop = null;
      shown = false;
      el.addEventListener("webglcontextrestored", () => setRestart((n) => n + 1), { once: true });
    };
    el.addEventListener("webglcontextlost", lost);
    // A slider moved: draw it again.
    const redraw = () => {
      dirty = true;
      measuredAt = 0;
    };
    const contrast = window.matchMedia("(prefers-contrast: more)");
    contrast.addEventListener("change", redraw);
    return () => {
      io.disconnect();
      stop?.();
      el.removeEventListener("webglcontextlost", lost);
      contrast.removeEventListener("change", redraw);
      // Its GPU objects go, and the context stays: React may run this effect again on the same canvas.
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [restart]);

  // No WebGL: an arch has its stand-in in the page's own CSS (the hero's `::before`); a field becomes a CSS gradient.
  if (flat && shape === "arch") return null;
  if (flat) {
    const [top, bottom] = fade;
    const mask = `linear-gradient(180deg, transparent 0%, #000 ${top * 100}%, #000 ${100 - bottom * 100}%, transparent 100%)`;
    // No shader to hold the light down behind text: kept faint everywhere instead.
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{ ...style, opacity: guard ? Math.min(amount, 0.18) : amount, background: `linear-gradient(180deg, ${stops.join(", ")})`, maskImage: mask, WebkitMaskImage: mask }}
      />
    );
  }
  return <canvas ref={canvas} className={className} style={style} aria-hidden="true" />;
}
