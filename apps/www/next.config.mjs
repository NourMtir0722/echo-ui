import path from "node:path";
import { fileURLToPath } from "node:url";
import createMDX from "@next/mdx";
import remarkGfm from "remark-gfm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * WHY EVERY SCRIPT PASSES `--webpack`, AND WHEN TO STOP.
 *
 * Turbopack is the default in Next 16; webpack is the opt-out. It was chosen
 * during the 15 -> 16 upgrade because most Next 16 stability reports at the
 * time were about Turbopack, and that was a reasonable risk call. It is also a
 * decision with a shelf life: each Next minor raises the chance that a fix, a
 * feature or a doc assumes Turbopack, and the webpack path gets less upstream
 * testing over time.
 *
 * It already costs something structural. Under webpack, Next 16 treats a
 * `page.mdx` as a client component and rejects its `metadata`, which is the
 * only reason every guide is a `page.tsx` + `content.mdx` PAIR instead of one
 * file.
 *
 * RE-TEST WHEN EITHER IS TRUE, on a branch, and keep `--webpack` if it still
 * wins. Pinned here rather than left to memory, in the style of the vinext
 * note in `wrangler.jsonc`:
 *
 *   1. A guide page works as a single `page.mdx` exporting `metadata` under
 *      Turbopack. That is the specific defect this flag is paying for, so it
 *      is the specific thing that retires it. Check it directly: move one
 *      guide to `page.mdx` and run `next build` without `--webpack`.
 *   2. Next 16.6.0. Far enough past the 16.3.5 this was decided on that
 *      "most stability reports are about Turbopack" needs re-checking rather
 *      than re-asserting.
 *
 * Dropping the flag means editing the four `apps/www` scripts that carry it,
 * not this file.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The guide pages under app/docs/(guides) are MDX:
  // prose-first and editable without reading JSX, with live values imported
  // from the registry so a token or tool name cannot go stale in the text.
  pageExtensions: ["ts", "tsx", "mdx"],
  // echo-ui-core is a workspace package whose exports point at TypeScript
  // source until it gets a build step for publishing.
  transpilePackages: ["echo-ui-core"],
  // Built registry item JSON is emitted to public/r/ by `pnpm build:registry`
  // and served as static assets at /r/<name>.json.

  // A `next dev` and a `next build`/`next start` sharing one .next directory
  // corrupt each other, so the dev server used by the console tests is pointed
  // at its own build dir via NEXT_DIST_DIR (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Opt-in static export, so the normal dev/test path is untouched.
  ...(process.env.ECHO_STATIC_EXPORT ? { output: "export" } : {}),

  // A stray package-lock.json in the home directory outranks this repo's
  // pnpm-lock.yaml when Next infers the workspace root, which points build
  // traces at ~ instead of the monorepo. Pin it to the repo root.
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // No gzip from `next start`. The site deploys as a static export, and the
  // host compresses at its edge; `next start` only serves the build the test
  // suite drives. There, browsers pulling gzipped, chunked responses through
  // the few keep-alive connections HTTP/1.1 allows a host stalled: a docs page
  // that loads in 100ms alone took 16-35s among eleven others.
  compress: false,
};

// GFM for tables in the guides. `.md` imports (CHANGELOG.md) are parsed as
// plain markdown, not MDX, so a literal `<` in the changelog is text.
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: { remarkPlugins: [remarkGfm] },
});

export default withMDX(nextConfig);
