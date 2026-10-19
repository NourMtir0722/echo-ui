/*
 * The browser half of look.ts: what the page shows, read with plain DOM.
 *
 * Sent to the page as written (look.ts reads this file as text), because tsx
 * compiles a function passed to page.evaluate with a naming helper the page
 * doesn't have. One expression; its value is the reading.
 */
/* global document, window, getComputedStyle, NodeFilter */
(async () => {
  await document.fonts.ready;

  // The canvas behind everything, in the page's colour scheme.
  const probe = document.createElement("div");
  probe.style.backgroundColor = "Canvas";
  document.documentElement.appendChild(probe);
  const canvas = getComputedStyle(probe).backgroundColor;
  probe.remove();

  // A point stands on the first opaque background up its ancestors.
  const standsOn = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(e).backgroundColor);
      if (!m) continue;
      const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (a >= 0.95) return `rgb(${r}, ${g}, ${b})`;
    }
    return canvas;
  };
  const ground = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x = ((col + 0.5) / 5) * window.innerWidth;
      const y = ((row + 0.5) / 4) * window.innerHeight;
      ground.push(standsOn(document.elementFromPoint(x, y)));
    }
  }

  const text = {};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const chars = (node.textContent || "").replace(/\s+/g, "").length;
    const el = node.parentElement;
    if (!chars || !el || !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
    const family = getComputedStyle(el).fontFamily.split(",")[0].trim();
    text[family] = (text[family] || 0) + chars;
  }

  const loaded = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
  return { ground, text, loaded: [...new Set(loaded)] };
})();
