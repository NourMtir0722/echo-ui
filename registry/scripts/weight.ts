/**
 * What an item costs a page: its JavaScript and CSS, minified and gzipped,
 * the way a production build ships them.
 *
 * Two JavaScript numbers, because they answer different questions. `js` is
 * the item's own code (with the Echo items it brings): what adding it costs
 * an app that already uses Echo. `withDependencies` adds what it pulls in from
 * echo-ui-core, Base UI, GSAP and the rest: what it costs as the first Echo
 * item on a page. React is never counted; every app has it.
 *
 * Measured with esbuild at registry-build time, so the numbers follow the code
 * and the dependency versions installed, not a table someone keeps.
 */
import { build, type Plugin } from "esbuild";
import { gzipSync } from "node:zlib";

export interface ItemWeight {
  /** The item's own JavaScript, and the Echo items it brings. */
  js: number;
  /** With everything it imports from npm and echo-ui-core, except React. */
  withDependencies: number;
  /** Its stylesheets. */
  css: number;
  /** It draws with WebGL: a GPU context on top of its bytes, and best loaded when it's shown. */
  gpu?: boolean;
}

const REACT = /^(react|react-dom|scheduler)(\/|$)/;

/** Leaves imports out of the bundle: every package, or only React. */
function external(everyPackage: boolean): Plugin {
  return {
    name: "external",
    setup(b) {
      b.onResolve({ filter: /^[^./]/ }, (args) => (everyPackage || REACT.test(args.path) ? { path: args.path, external: true } : undefined));
    },
  };
}

const gz = (text: string) => gzipSync(text, { level: 9 }).length;

async function measure(entry: string, everyPackage: boolean): Promise<{ js: number; css: number; gpu: boolean }> {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    minify: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    outdir: "out",
    loader: { ".css": "css" },
    plugins: [external(everyPackage)],
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  let js = 0;
  let css = 0;
  let gpu = false;
  for (const file of result.outputFiles) {
    if (file.path.endsWith(".js")) {
      js += gz(file.text);
      if (/getContext\(\s*["']webgl2?["']/.test(file.text)) gpu = true;
    } else if (file.path.endsWith(".css")) css += gz(file.text);
  }
  return { js, css, gpu };
}

/** An item's weight, from its entry file (its `index.ts`). */
export async function itemWeight(entry: string): Promise<ItemWeight> {
  const own = await measure(entry, true);
  const all = await measure(entry, false);
  return { js: own.js, withDependencies: all.js, css: own.css, ...(own.gpu ? { gpu: true } : {}) };
}
