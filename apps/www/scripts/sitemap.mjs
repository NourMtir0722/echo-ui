/**
 * Writes `sitemap.xml` into the static export: every page the deploy serves.
 *
 * It's read off the export itself, after `prune-fixtures.mjs` has taken the
 * fixtures out, so it can't name a page production doesn't serve or leave out
 * one it does: a list kept by hand beside 120 component pages, the guides,
 * the templates and the gallery would drift the way the hand-kept lists in
 * this repository always have. `robots.txt` points at it (`app/robots.ts`).
 *
 * The host is `registry.json`'s `homepage`, which `identity.test.ts` holds to
 * every other place the domain is named.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Served, but not pages anyone should be sent to: Next's own error pages, and the thank-you page a payment leads to (it says noindex). */
const NOT_PAGES = new Set(["/404", "/_not-found", "/supporters/welcome"]);

/** Every page in an export, as the path it's served at, in order. */
export async function exportedPages(out) {
  const pages = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "_next") await walk(path);
      } else if (entry.name.endsWith(".html")) {
        const route = `/${relative(out, path).split(sep).join("/")}`.replace(/\.html$/, "").replace(/(^|\/)index$/, "");
        pages.push(route || "/");
      }
    }
  }
  await walk(out);
  return pages.filter((page) => !NOT_PAGES.has(page)).sort();
}

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The sitemap for these pages on this origin. */
export function sitemapXml(origin, pages) {
  // Trimmed by count, not /\/+$/, which is quadratic on a long run of slashes.
  let end = origin.length;
  while (end > 0 && origin[end - 1] === "/") end--;
  const base = origin.slice(0, end);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map((page) => `  <url><loc>${escape(`${base}${page === "/" ? "/" : page}`)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

/* Run as a script by `build:static`, after the prune. */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(appRoot, process.argv[2] ?? process.env.NEXT_DIST_DIR ?? "out");
  const { homepage } = JSON.parse(await readFile(resolve(appRoot, "../../registry/registry.json"), "utf8"));
  const pages = await exportedPages(out);
  if (pages.length === 0) {
    console.error(`sitemap: ${out} has no pages — run the static export first`);
    process.exit(1);
  }
  await writeFile(join(out, "sitemap.xml"), sitemapXml(homepage, pages));
  console.log(`sitemap: ${pages.length} pages written to sitemap.xml`);
}
