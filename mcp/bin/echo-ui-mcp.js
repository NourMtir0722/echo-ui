#!/usr/bin/env node
/**
 * Runs the server from TypeScript source via tsx's programmatic API — the same
 * way apps/www and the registry scripts consume registry source, so there is
 * one copy of the catalog module rather than a compiled fork of it.
 *
 * `tsx/esm/api` is the supported entry; `register("tsx/esm", …)` from
 * node:module goes through the loader hook tsx deprecated and exits on start.
 */
import { register } from "tsx/esm/api";

register();
await import("../src/index.ts");
