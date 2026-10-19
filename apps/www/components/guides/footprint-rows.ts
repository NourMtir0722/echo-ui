/**
 * The rows of "What Echo puts in your project", from the same list `init`
 * prints its summary from and `agent off` removes by, so the page can't say
 * something `init` doesn't do, or leave out something it does.
 */
import { FOOTPRINT, type FootprintItem } from "@registry/agent/footprint";

export interface FootprintRow {
  id: string;
  /** What it is; `code` spans in backticks. */
  what: string;
  /** What kind of thing it is, in the reader's terms. */
  kind: string;
  /** Where it lands, the Echo folder named as what it is. */
  where: string[];
  why: string;
  removal: string;
}

const KIND: Record<FootprintItem["kind"], string> = {
  file: "a file of Echo's",
  block: "a marked block in a file of yours",
  entry: "one entry in a file of yours",
  dependency: "a package",
};

const FOLDER = { dir: "<your Echo folder>" };

export function footprintRows(): FootprintRow[] {
  return FOOTPRINT.map((item) => ({
    id: item.id,
    what: item.kind === "dependency" ? `\`${item.label(FOLDER).replace(/ \(dev\)$/, "")}\`` : item.label(FOLDER),
    kind: item.kind === "dependency" && /\(dev\)/.test(item.label(FOLDER)) ? "a dev dependency" : KIND[item.kind],
    where: item.kind === "dependency" ? ["package.json"] : item.paths(FOLDER),
    why: item.what,
    removal: item.removal,
  }));
}
