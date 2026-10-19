import { test } from "node:test";
import assert from "node:assert/strict";

import { hashContent, RegistryError, type EIndex, type EItem, type Fetcher } from "@echo-ui/client";

import { createRegistrySource, REGISTRY_TTL_MS, STALE_RETRY_MS } from "./registry-source";

/**
 * A registry that can publish a release while the server is running: the
 * index and each `{name}.json` move to the new version, `{name}@{version}.json`
 * files stay as they were.
 */
function liveRegistry() {
  const content = "export const Modal = () => null;\n";
  const make = (version: string): EItem => ({
    schemaVersion: 1,
    name: "modal",
    version,
    kind: "component",
    title: "Modal",
    description: "A panel.",
    core: ">=0.1.0 <0.2.0",
    dependencies: {},
    items: [],
    files: [{ path: "modal/modal.tsx", sha256: hashContent(content), content }],
    setup: [],
    motion: [],
    sound: [],
    a11y: { standard: "WCAG 2.2 AA", tested: [], limits: [] },
    changes: [],
  });
  const pinned = new Map<string, EItem>();
  let latest = make("0.1.0");
  pinned.set("modal@0.1.0", latest);
  const index = (): EIndex => ({
    schemaVersion: 1,
    version: latest.version,
    core: "0.1.0",
    items: [{ name: "modal", version: latest.version, kind: "component", title: "Modal", description: "A panel.", items: [] }],
  });
  const fetcher: Fetcher = async (url) => {
    const path = decodeURIComponent(url.split("/").pop()!).replace(/\.json$/, "");
    if (path === "index") return JSON.stringify(index());
    if (path === "modal") return JSON.stringify(latest);
    const item = pinned.get(path);
    if (!item) throw new RegistryError(`404 Not Found for ${url}`);
    return JSON.stringify(item);
  };
  return {
    fetcher,
    publish(version: string) {
      latest = make(version);
      pinned.set(`modal@${version}`, latest);
    },
  };
}

test("a release published while the server runs is seen once the index expires", async () => {
  const registry = liveRegistry();
  let clock = 0;
  const source = createRegistrySource({
    registry: "https://example.test/e",
    registryFetcher: registry.fetcher,
    now: () => clock,
  });

  assert.equal((await source.index()).version, "0.1.0");
  assert.equal((await source.item("modal"))?.version, "0.1.0");

  registry.publish("0.2.0");
  // Inside the TTL the index is trusted, and the item follows the index.
  assert.equal((await source.index()).version, "0.1.0");
  assert.equal((await source.item("modal"))?.version, "0.1.0");

  clock += REGISTRY_TTL_MS + 1;
  assert.equal((await source.index()).version, "0.2.0");
  assert.equal((await source.item("modal"))?.version, "0.2.0");
});

test("an index that has only aged out answers while the registry can't be read, and is tried again a minute on", async () => {
  const registry = liveRegistry();
  let clock = 0;
  let down = false;
  let reads = 0;
  const source = createRegistrySource({
    registry: "https://example.test/e",
    registryFetcher: async (url) => {
      if (url === "https://example.test/e/index.json") reads += 1;
      if (down) throw new RegistryError(`503 Service Unavailable for ${url}`);
      return registry.fetcher(url);
    },
    now: () => clock,
  });

  assert.equal((await source.index()).version, "0.1.0");
  down = true;
  clock += REGISTRY_TTL_MS + 1;
  assert.equal((await source.index()).version, "0.1.0");
  assert.equal((await source.styles().catch(() => "down")), "down", "no copy of the styles yet, so that one says so");
  clock += STALE_RETRY_MS - 1;
  await source.index();
  assert.equal(reads, 2, "not read again inside the minute");
  down = false;
  registry.publish("0.2.0");
  clock += 2;
  assert.equal((await source.index()).version, "0.2.0");
});
