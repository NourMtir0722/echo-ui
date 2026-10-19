import { test, expect } from "@playwright/test";

/**
 * A row of cards, on /checks/card-row, the way an agent built a
 * pricing page. The cards stood at their own heights inside their list items,
 * so the footer keys sat at three heights; the keys hung at the footer's far
 * end; and the features, as Items, ended in "…".
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/checks/card-row");
});

test("a Card in a list item fills it, and a row of them lines its footer keys up", async ({ page }) => {
  const boxes = await page.locator("#tiers li:has(> .echo-card)").evaluateAll((items) =>
    items.map((li) => {
      const card = li.querySelector(".echo-card")!.getBoundingClientRect();
      const key = li.querySelector(".echo-card__footer .echo-hw")!.getBoundingClientRect();
      const row = li.getBoundingClientRect();
      return { top: Math.round(row.top), liBottom: row.bottom, cardBottom: card.bottom, keyTop: key.top };
    }),
  );
  for (const b of boxes) expect(Math.abs(b.cardBottom - b.liBottom)).toBeLessThanOrEqual(1);
  // Cards that share a row (three at desktop width, one on a phone).
  const rows = Map.groupBy(boxes, (b) => b.top);
  for (const row of rows.values()) {
    const tops = row.map((b) => b.keyTop);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  }
});

test("a footer's key starts at the card's content edge, and a full-width key spans it", async ({ page }) => {
  const edges = await page.locator("#tiers li:has(> .echo-card)").evaluateAll((items) =>
    items.map((li) => ({
      content: li.querySelector(".echo-card__header")!.getBoundingClientRect().left,
      key: li.querySelector(".echo-card__footer .echo-hw")!.getBoundingClientRect().left,
    })),
  );
  for (const e of edges) expect(Math.abs(e.key - e.content)).toBeLessThanOrEqual(1);

  const wide = await page.locator("#wide").evaluate((el) => ({
    footer: el.querySelector(".echo-card__footer")!.getBoundingClientRect().width,
    key: el.querySelector(".echo-hw")!.getBoundingClientRect().width,
  }));
  expect(Math.abs(wide.key - wide.footer)).toBeLessThanOrEqual(1);
});

test("an Item shows its whole title, on more lines when it needs them; truncate keeps one line", async ({ page }) => {
  const titles = page.locator("#tiers .echo-item__title");
  const cut = await titles.evaluateAll((els) =>
    els.filter((el) => el.scrollWidth > el.clientWidth + 1 || getComputedStyle(el).textOverflow === "ellipsis").map((el) => el.textContent),
  );
  expect(cut).toEqual([]);
  const tall = await titles.evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0 && el.clientHeight > parseFloat(getComputedStyle(el).lineHeight) * 1.5).length);
  expect(tall).toBeGreaterThan(0);

  const kept = page.locator("#truncated .echo-item__title");
  expect(await kept.evaluate((el) => getComputedStyle(el).textOverflow)).toBe("ellipsis");
  expect(await kept.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
});

test("two cards, or two choices, in a row with room for three share the row", async ({ page }) => {
  for (const [id, grid] of [
    ["#pair", ".echo-grid"],
    ["#choices", ".echo-choice-cards__grid"],
  ] as const) {
    const gap = await page.locator(id).evaluate((el, sel) => {
      const g = el.querySelector(sel)!;
      const items = [...g.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 1 && r.height > 1);
      const cs = getComputedStyle(g);
      const end = g.getBoundingClientRect().right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
      return { empty: end - Math.max(...items.map((r) => r.right)), items: items.length };
    }, grid);
    expect(gap.items, id).toBe(2);
    expect(gap.empty, id).toBeLessThanOrEqual(1);
  }
});
