/**
 * What Echo needs from a Content Security Policy, and why.
 *
 * Echo adds no scripts of its own, evaluates no strings, starts no workers and
 * loads nothing from another origin; its CSS is files your bundler serves. A
 * strict policy works with the allowances below, and two of them only for one
 * component each. The installation guide renders this list, and
 * `csp.test.ts` holds it to the code: a component that starts needing
 * something new fails there until it's written down here.
 */

export interface CspNeed {
  /** The source expression, and the directive it goes in. */
  directive: string;
  source: string;
  /** The items that need it, or "all". */
  items: "all" | readonly string[];
  /** Why, in a sentence. */
  why: string;
}

export const CSP_NEEDS: readonly CspNeed[] = [
  {
    directive: "style-src-attr",
    source: "'unsafe-inline'",
    items: "all",
    why:
      "A part that moves or fills carries its value in a style attribute: a slider's position, a meter's level, a chart's bars. Base UI, Echo's behaviour layer, places its parts the same way, and React writes `style` props as attributes when it renders on the server. Stylesheets stay strict; only attributes are allowed.",
  },
  {
    directive: "img-src",
    source: "data:",
    items: ["echo-textures"],
    why: "Textures draws its tiles as small SVGs in `data:` URLs.",
  },
  {
    directive: "media-src",
    source: "blob:",
    items: ["echo-voice-note"],
    why: "VoiceNote plays back what it just recorded from a `blob:` URL.",
  },
];

/**
 * A strict policy for an app using Echo. `{nonce}` is the one your server makes
 * for each response; Next.js puts it on its own scripts when middleware sets
 * this header.
 */
export function cspPolicy({ textures = false, voiceNote = false } = {}): string[] {
  return [
    "default-src 'self'",
    "script-src 'self' 'nonce-{nonce}' 'strict-dynamic'",
    "style-src 'self' 'nonce-{nonce}'",
    "style-src-attr 'unsafe-inline'",
    textures ? "img-src 'self' data:" : "img-src 'self'",
    ...(voiceNote ? ["media-src 'self' blob:"] : []),
    "object-src 'none'",
    "base-uri 'self'",
  ];
}
