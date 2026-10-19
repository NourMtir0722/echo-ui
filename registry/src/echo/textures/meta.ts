import { z } from "zod";

export const texturesProps = z.object({
  dither: z.boolean().optional().describe("Textured only: include the dither layer. Default true."),
  noise: z.boolean().optional().describe("Textured only: include the noise layer. Default true."),
  opacity: z.number().optional().describe("Layer opacity; each texture ships its usual weight."),
  blend: z
    .string()
    .optional()
    .describe("CSS mix-blend-mode against the surface below (overlay, soft-light, multiply)."),
  fixed: z
    .boolean()
    .default(false)
    .describe("Pin to the viewport instead of the positioned ancestor."),
  tone: z
    .enum(["dark", "light"])
    .optional()
    .describe("Dither only — dark ink deepens the surface, light ink lifts it."),
  scale: z.number().optional().describe("Dither only — tile scale multiplier; 1 = a 16px tile."),
  grain: z.enum(["fine", "coarse"]).optional().describe("Noise only — fine for surfaces, coarse for fields."),
  size: z.number().optional().describe("Noise only — tile size in px; larger reads softer."),
  cell: z.number().optional().describe("Halftone only — dot pitch in px."),
  gap: z.number().optional().describe("Scanlines only — line pitch in px."),
});

export const meta = {
  name: "echo-textures",
  title: "Textures",
  description:
    "The grain law as composable overlays: Dither (ordered Bayer), Noise (film grain), Halftone, Scanlines, plus GrainField (the brand surface) and Textured (the default stack). Nothing in Echo is ever a flat fill — and a dither or grain pass is the cure for the banding that large soft gradients show on the dark chassis. All tiles are generated as inline SVG data-URIs, so there are no asset files to copy. Every overlay is aria-hidden and pointer-events: none.",
  props: texturesProps,
  examples: [
    {
      title: "De-band a gradient",
      description: "The overlay fills the nearest positioned ancestor, so give it one.",
      code: '<div style={{ position: "relative" }}><Hero /><Dither opacity={0.18} /></div>',
    },
    {
      title: "Product whisper",
      description: "A panel gets grain, not a full treatment.",
      code: "<Textured dither={false}><Panel>Settings</Panel></Textured>",
    },
    {
      title: "Brand field",
      description: "The marketing surface; blooms in whatever the seed accent is.",
      code: '<GrainField tone="accent" style={{ minHeight: 320 }}><h1>Echo UI</h1></GrainField>',
    },
    {
      title: "Screen register",
      description: "Scanlines over a screen Panel, never over plastic.",
      code: '<Panel variant="screen"><Readout /><Scanlines gap={3} /></Panel>',
    },
  ],
  feel: "Print and screen grain — dither, noise, halftone, scanlines — laid over a surface so it reads as a made object.",
  usage: {
    imports: [
      "import { Panel } from \"@/echo/panel\";",
      "import { Textured } from \"@/echo/textures\";",
    ].join("\n"),
    code: [
      "<Textured>",
      "  <Panel>Settings</Panel>",
      "</Textured>",
    ].join("\n"),
  },
  composition: "Textured\nDither\nNoise\nHalftone\nScanlines\nGrainField",
  a11y: [
    "Every overlay is decorative: `aria-hidden` and `pointer-events: none`, so it never reaches the accessibility tree or catches a click.",
    "Texture sits over content at low opacity. Check that text under it still meets contrast — the theme's guarantee is for the roles, not for what you lay on top of them.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "Nothing moves: every texture is static.",
  },
  antiPatterns: [
    "Never stack every texture at once — one structural texture (dither OR halftone) plus grain is the ceiling; more reads as a filter, not a material.",
    "Never put Scanlines or Halftone on a raised plastic surface — those are screen and print registers; plastic gets Noise.",
    "Never raise Noise above ~0.08 on a product surface; the loud grain (0.3+) belongs to GrainField and marketing only.",
    "Never give an overlay a positioned ancestor it does not have — an absolutely-filling texture with no relative parent escapes to the page. Textured and GrainField provide their own; bare overlays do not.",
    "Never animate a texture's opacity to signal state — texture is material, not feedback. Use StatusDot or Progress.",
  ],
} as const;
