import { z } from "zod";

export const shaderFieldProps = z.object({
  theme: z
    .unknown()
    .optional()
    .describe(
      "EchoTheme mirror (createEchoTheme().values) that pins the field colours. Omit it and the field follows the --echo-accent-* variables in scope, re-reading them when the page is reseeded.",
    ),
  label: z
    .string()
    .optional()
    .describe(
      "Accessible name. Omit and the field is decorative (aria-hidden) — right for a background.",
    ),
});

export const meta = {
  name: "echo-shader-field",
  title: "ShaderField",
  description:
    "The live brand field: a WebGL domain-warped fbm gradient sampled from the accent ramp, blooming toward the cursor, with animated grain and TPDF debanding. Reads the accent ramp from the CSS it sits in (or from a pinned theme mirror), so it relights with the seed like every other surface. Reduced motion draws one static frame; no WebGL falls back to the wrapper's CSS gradient; the GL context is released on unmount.",
  props: shaderFieldProps,
  examples: [
    {
      title: "Hero background",
      description: "Decorative by default — give the wrapper a size.",
      code: '<div style={{ height: 420 }}><ShaderField /></div>',
    },
    {
      title: "Themed",
      description: "Pass a seeded theme mirror and the field follows the accent.",
      code: 'const theme = createEchoTheme({ accent: "#F2674E" }).values;\n<ShaderField theme={theme} />',
    },
  ],
  feel: "A slow, glowing field in the accent colour that leans toward the cursor — ambient, never busy.",
  usage: {
    imports: "import { ShaderField } from \"@/echo/shader-field\";",
    code: [
      "<div style={{ height: 420 }}>",
      "  <ShaderField />",
      "</div>",
    ].join("\n"),
  },
  composition: "ShaderField",
  a11y: [
    "Decorative by default (`aria-hidden`). Pass `label` only when the field carries meaning, and it becomes `role=\"img\"` with that name.",
    "Without WebGL it draws a CSS gradient instead, so the space it occupies never goes blank.",
  ],
  motion: {
    tokens: [],
    reducedMotion: "It draws one still frame and stops: no animation loop, no cursor tracking.",
  },
  antiPatterns: [
    "Never put readable body text directly on the field — it moves and its contrast is not guaranteed. Put text on a Panel over it, or use GrainField, which carries an edge-darkening pass for exactly this.",
    "Never mount more than one or two ShaderFields on a page — each holds a live WebGL context and a rAF loop; browsers cap contexts, and a grid of them will drop frames on integrated GPUs.",
    "Never give it a `label` unless it genuinely carries meaning; a named background is noise in the a11y tree.",
    "Never reach for it as a page background behind an app — it is the marketing field. Product surfaces are the chassis plus a whisper of Noise.",
  ],
} as const;
