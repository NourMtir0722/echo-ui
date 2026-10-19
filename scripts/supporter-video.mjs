#!/usr/bin/env node
/**
 * The film /support shows of what a supporter gets: Noor's place on Echo's
 * island, made by her card's own "Make the video" (supporters/video.ts), as
 * every supporter's card makes theirs. Nothing is redrawn, so it's the video
 * a supporter would post.
 *
 * Run it after the island or the video changes, against a running site (the
 * dev server will do), and watch the film before committing it:
 *
 *   node scripts/supporter-video.mjs [url]   (default: http://localhost:3000)
 *
 * It writes apps/www/public/support/noor-place.mp4, a little smaller than the
 * card's 1080 × 1080 for the page, and its first frame as noor-place.webp, the
 * poster shown until it plays. It needs ffmpeg and cwebp on the PATH.
 */
import { chromium } from "@playwright/test";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

const url = argv[2] ?? "http://localhost:3000";
const dir = fileURLToPath(new URL("../apps/www/public/support/", import.meta.url));
const SIZE = 720;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${url}/supporters#noor`, { waitUntil: "load" });
const card = page.getByRole("dialog", { name: "Noor" });
await card.getByRole("button", { name: "Make the video" }).click({ timeout: 30_000 });
const film = card.locator("video");
await film.waitFor({ timeout: 180_000 });
const bytes = await film.evaluate(async (v) => [...new Uint8Array(await (await fetch(v.src)).arrayBuffer())]);
await browser.close();

const work = mkdtempSync(join(tmpdir(), "echo-film-"));
const made = join(work, "noor.mp4");
writeFileSync(made, Buffer.from(bytes));
mkdirSync(dir, { recursive: true });
const ffmpeg = (...args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
// Silent, as the card makes it; starts playing before it has all arrived.
ffmpeg("-i", made, "-vf", `scale=${SIZE}:${SIZE}:flags=lanczos`, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", join(dir, "noor-place.mp4"));
const first = join(work, "first.png");
ffmpeg("-i", made, "-vf", `scale=${SIZE}:${SIZE}:flags=lanczos`, "-frames:v", "1", first);
execFileSync("cwebp", ["-quiet", "-q", "82", "-metadata", "none", first, "-o", join(dir, "noor-place.webp")]);
rmSync(work, { recursive: true });
console.log(`Wrote ${join(dir, "noor-place.mp4")} and its poster`);
