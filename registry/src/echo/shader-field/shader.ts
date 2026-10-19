/**
 * ShaderField GLSL. Kept in its own module so the
 * component file stays readable and the shader can be unit-checked as data.
 *
 * The field is an iterative domain warp (fbm of fbm of fbm, after Inigo
 * Quilez) — organic, non-repeating flow. Octaves are rotated between passes so
 * no axis artefacts show. Colour is sampled from the Echo accent ramp passed
 * in as uniforms, so the field relights with the seed like everything else.
 * Per-channel chromatic split, a cursor bloom that warps the flow toward the
 * pointer, and TPDF debanding + animated grain so the dark base never
 * posterises — the grain law, made live.
 */

export const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

export const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
uniform vec3 cVoid, cA, cB, cC;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float hash(vec2 p){ p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0,0.0)), c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
  vec2 u = f*f*(3.0 - 2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 m = rot(0.55);
  for(int i = 0; i < 6; i++){ v += a * noise(p); p = m * p * 2.0 + 11.3; a *= 0.5; }
  return v;
}
// the accent ramp sampled by a scalar field: deep → mid → glow → light
vec3 pal(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 c = mix(cVoid, cA, smoothstep(0.0, 0.5, x));
  c = mix(c, cB, smoothstep(0.45, 0.78, x));
  c = mix(c, cC, smoothstep(0.74, 1.0, x));
  return c;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y) * 1.6;
  vec2 m = vec2(uMouse.x * asp, uMouse.y) * 1.6;
  float t = uTime * 0.06;

  // ---- iterative domain warp ----
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7, 9.2) + 0.7*t),
                fbm(p + 4.0*q + vec2(8.3, 2.8) - 0.6*t));

  // cursor bloom warps the flow field toward the pointer
  float md = length(m - p);
  r += (m - p) * 0.35 * exp(-md * 1.3);

  float f = fbm(p + 4.0*r);

  // ---- per-channel chromatic split (widens near the cursor) ----
  float split = 0.035 + 0.05 * exp(-md * 2.0);
  vec3 col = vec3(pal(f + split).r, pal(f).g, pal(f - split).b);

  // depth: warp magnitude adds richness where the field folds
  col = mix(col, col * 1.18, clamp(dot(r, r), 0.0, 1.0));

  // hot bloom under the cursor (emissive)
  col += (cC * 0.14 + cA * 0.20) * exp(-md * 3.0);

  // let the deep folds sink toward the void so the field has real dark
  col = mix(cVoid * 0.45, col, smoothstep(0.06, 0.62, f));
  // vignette
  col *= 1.0 - 0.28 * pow(length(uv - 0.5), 2.2);

  // ---- grain + TPDF debanding (the anti-cheap finish) ----
  float grain = hash(gl_FragCoord.xy * 0.7 + uTime * 60.0) - 0.5;
  col += grain * 0.03;
  float dz = hash(gl_FragCoord.xy + uTime) - hash(gl_FragCoord.xy + 7.1 - uTime);
  col += dz * (1.5 / 255.0);

  gl_FragColor = vec4(col, 1.0);
}`;

/** #RRGGBB (or #RGB) → normalised RGB triple for a GL uniform. */
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  const n = Number.parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) throw new TypeError(`hexToRgb: not a hex colour: ${hex}`);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
