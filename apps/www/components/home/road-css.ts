import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The road's stylesheet (journey.css) and the close's (blueprint/blueprint.css),
 * as the homepage sets them into the page after its content instead of linking
 * them from its head (app/page.tsx says why): the files' own rules, without
 * their comments and indentation.
 */
export function roadCss(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

const SHEETS = ["components/home/journey/journey.css", "components/home/blueprint/blueprint.css"];
const readRoad = () => SHEETS.map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");

let built: string | undefined;

/**
 * The road's styles for this render of the homepage: read once for a build,
 * and on every render in development. Read once there too, an edit to
 * journey.css alone never reached the page until something the page imports
 * changed, so a reload showed the old rules.
 */
export function roadStyles(read: () => string = readRoad, production = process.env.NODE_ENV === "production"): string {
  if (!production) return roadCss(read());
  return (built ??= roadCss(read()));
}
