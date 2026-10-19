import { test, expect } from "@playwright/test";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo, Socket } from "node:net";

import { gotoDev, visitDev } from "./helpers/dev-server";

/**
 * The specs that drive the dev server visit it through `gotoDev`. Next's dev
 * server exits and comes back when its heap nears its limit, and in CI a
 * visit that landed in those seconds was refused and failed the docs sweep,
 * though every page was fine. A server that's down, then back, is
 * what this plays.
 */
test("a visit to the dev server waits out its restart", async ({ page }) => {
  const serve = () => createServer((_, res) => res.end("<title>back</title>"));

  // A free port, let go of: nothing answers on it, as between Next's exit and its restart.
  const probe = serve().listen(0);
  await once(probe, "listening");
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));

  let back: Server | undefined;
  const restart = setTimeout(() => {
    back = serve().listen(port);
  }, 1_500);
  try {
    await gotoDev(page, `http://localhost:${port}/`);
    await expect(page).toHaveTitle("back");
  } finally {
    clearTimeout(restart);
    back?.close();
  }
});

/**
 * The other half: the restart lands while a page is still loading its own
 * files. The page itself came, but its stylesheet's connection was cut, and
 * the docs sweep counted the browser's "Failed to load resource" as the page's
 * fault. A visit the restart cut short is made again, and only the
 * whole visit is measured.
 */
test("a visit the dev server's restart cut short is made again, not counted", async ({ page }) => {
  const connections = new Set<Socket>();
  let restarted = false;
  const server: Server = createServer((req, res) => {
    if (req.url === "/style.css" && !restarted) {
      // Next exits mid-visit: every connection goes, and nothing listens until it's back.
      restarted = true;
      server.close();
      for (const c of connections) c.destroy();
      setTimeout(() => server.listen(port), 1_500);
      return;
    }
    if (req.url === "/style.css") {
      res.writeHead(200, { "content-type": "text/css" }).end("body { margin: 0 }");
      return;
    }
    res.writeHead(200, { "content-type": "text/html" }).end('<title>page</title><link rel="stylesheet" href="/style.css">');
  });
  server.on("connection", (c) => {
    connections.add(c);
    c.on("close", () => connections.delete(c));
  });
  server.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  const said: string[] = [];
  page.on("console", (m) => said.push(`[${m.type()}] ${m.text()}`));
  try {
    await visitDev(page, `http://localhost:${port}/`, said);
    await expect(page).toHaveTitle("page");
    expect(said).toEqual([]);
  } finally {
    server.close();
    for (const c of connections) c.destroy();
  }
});
