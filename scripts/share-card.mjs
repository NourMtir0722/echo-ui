#!/usr/bin/env node
/**
 * The share card: the picture X, LinkedIn and Product Hunt show for a link to
 * echo-ui.com. It's the homepage's own hero, photographed at 1200×630: the
 * light, the grid, DESIGN and SYSTEM, the device with Echo on its screen, in
 * the brand's blue. Nothing is redrawn, so the card looks like the page.
 *
 * For a card, the hero loses what only works on the page (the links, the
 * keys, the long paragraph), the wordmark grows, and its one line is the
 * close's, "Tactile components, your style.", with the address opposite.
 *
 * Run it after the hero changes, against a running site (the dev server will
 * do), and look at the card before committing it:
 *
 *   node scripts/share-card.mjs [url]   (default: http://localhost:3000)
 *
 * It writes apps/www/app/opengraph-image.jpg, which Next serves as the
 * homepage's og:image (and twitter:image).
 */
import { chromium } from "@playwright/test";
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

const url = argv[2] ?? "http://localhost:3000";
const out = fileURLToPath(new URL("../apps/www/app/opengraph-image.jpg", import.meta.url));
const SIZE = { width: 1200, height: 630 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "load" });
// The light rises as the page opens (2.2s), then its shader takes over from the CSS stand-in.
await page.locator(".hero4[data-lit]").waitFor({ timeout: 30_000 });
await page.waitForTimeout(2500);

await page.addStyleTag({
  content: `
    html, body { overflow: hidden !important; }
    .keychain, nextjs-portal, .hero4__links, .hero4__support, .hero4__ctas { display: none !important; }
    .hero4 { margin: 0 !important; min-height: 0 !important; height: ${SIZE.height}px !important; border: 0 !important; border-radius: 0 !important; }
    .hero4__brand .echo-wordmark { zoom: 1.55; }
    .hero4 .hero4__lede { font-size: 25px !important; max-width: none !important; letter-spacing: -0.005em; }
    .card-url { position: absolute; right: var(--hero-pad-x); bottom: clamp(1.5rem, 3vw, 2.25rem); margin: 0; }
  `,
});
await page.evaluate(() => {
  const lede = document.querySelector(".hero4__lede");
  lede.textContent = "Tactile components, your style.";
  const address = lede.cloneNode();
  address.className = "hero4__lede card-url";
  address.textContent = "echo-ui.com";
  document.querySelector(".hero4").append(address);
  document.documentElement.scrollTop = 0;
});
await page.waitForTimeout(1000);

await page.screenshot({ path: out, type: "jpeg", quality: 92, clip: { x: 0, y: 0, ...SIZE } });
await browser.close();
console.log(`Wrote ${out}`);
