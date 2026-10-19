/**
 * `pnpm docs:ack <item> [<item> …]` — confirm an item's docs are still right
 * after its source changed, by re-recording its hash in docs-lock.json.
 *
 * Run it AFTER reviewing the item's meta.ts (description, examples, props,
 * usage, composition, a11y) and its page. `--stale` acks every item whose
 * hash is out of date; `--all` rewrites the whole lock (first setup only).
 * Item names take the `echo-` prefix or not: `hardware-button` works. A
 * guide is `guide:<folder>` (`guide:theming`): ack it after reading the guide
 * against the code guide-sources.ts names for it.
 */
import { guideItems, hashItem, readLock, registryItems, writeLock } from "./lock";

const args = process.argv.slice(2);
const items = [...registryItems(), ...guideItems()];
const lock = readLock();

let targets: typeof items;
if (args.includes("--all")) targets = items;
else if (args.includes("--stale")) targets = items.filter((i) => lock[i.name] !== hashItem(i));
else {
  targets = args.map((a) => {
    const item = items.find((i) => i.name === a || i.name === `echo-${a}`);
    if (!item) {
      console.error(`docs:ack: no registry item or guide named "${a}"`);
      process.exit(1);
    }
    return item;
  });
}

if (targets.length === 0) {
  console.log(args.length ? "docs:ack: nothing to ack — every item is current." : "usage: pnpm docs:ack <item…> | --stale | --all");
  process.exit(args.length ? 0 : 1);
}

const next = args.includes("--all") ? {} : { ...lock };
for (const item of targets) next[item.name] = hashItem(item);
writeLock(next);
console.log(`docs:ack: confirmed ${targets.map((t) => t.name).join(", ")}`);
