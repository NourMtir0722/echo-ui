/**
 * The thank-you emails, from Noor, sent the moment Stripe says a checkout went
 * through (stripe.ts): the first, with the supporter's own link to
 * /supporters/welcome, for when they never got there (the tab closed, the
 * connection dropped) and for later; and, for someone whose Echo is already on
 * the island, a thank-you for supporting again, with what it did for their Echo.
 * Monthly renewals get no email of their own: Stripe's receipt says it.
 *
 * What's kept is only that a session was thanked (KV `thanked:<session>`, for a
 * while), so a retried event doesn't send twice; the address is never kept.
 */

/** The email's colours: Echo's own, on the brand's blue (the site's Sky). */
const INK = "#1F2330";
const DIM = "#4A5468";
const PAPER = "#E9F0FA";
const PANEL = "#FBFDFF";
const RULE = "#D3DFF0";
const SCREEN = "#1F2330";
const BEZEL = "#2C3242";

/** One letter's words: everything else is the same in each. */
interface Words {
  subject: string;
  preheader: string;
  caption: string;
  hi: string;
  paragraphs: string[];
  button: { label: string; href: string };
  /** The small line under the key; `{link}` in it is their own page. */
  keep: string;
}

/** HTML's five, for words that may hold a name a supporter chose (the page refuses < and >; an email is its own place). */
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const FONT = "'Red Hat Text',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DISPLAY = "'Red Hat Display',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * A letter from Noor, in Echo's materials: the paper ground, a panel, Echo
 * jumping on its device's screen (public/email/echo-hop.gif on the site), and
 * the site's primary key. Tables and inline styles, so every mail app draws it;
 * a plain-text copy for the ones that don't draw HTML.
 */
function letter(site: string, link: string, w: Words) {
  const text = [
    w.hi,
    "",
    ...w.paragraphs.flatMap((p) => [p, ""]),
    `${w.button.label}: ${w.button.href}`,
    "",
    w.keep.replace("{link}", link),
    "",
    "Thank you, truly.",
    "Noor",
    "",
    "You’re getting this because you just supported Echo UI. Questions? Just reply.",
  ].join("\n");
  const keep = escape(w.keep).replace("{link}", `<a href="${link}" style="color:${DIM}">your own page</a>`);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${w.subject}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@800&family=Red+Hat+Text:wght@400;700&display=swap');
@media (prefers-color-scheme: dark) {
  .ground { background:#11141C !important; }
  .panel { background:${INK} !important; border-color:#323949 !important; }
  .ink { color:#E9F0FA !important; }
  .dim { color:#AEB8CC !important; }
}
@media (max-width: 600px) { .pad { padding:28px 22px !important; } }
</style></head>
<body style="margin:0;padding:0;background:${PAPER}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(w.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="ground" style="background:${PAPER}"><tr><td align="center" style="padding:32px 12px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td class="ink" style="padding:0 8px 16px;font:800 15px/1 ${DISPLAY};letter-spacing:3px;color:${INK}">ECHO <span style="font-size:10px;letter-spacing:2px">UI</span></td></tr>
<tr><td class="panel pad" style="background:${PANEL};border:1px solid ${RULE};border-radius:24px;padding:36px 32px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${BEZEL};border-radius:20px;padding:10px">
    <img src="${site}/email/echo-hop.gif" width="476" alt="Echo, the blue mascot, jumping for joy" style="display:block;width:100%;max-width:476px;height:auto;border:0;border-radius:12px;background:${SCREEN};color:#E9F0FA;font:14px ${FONT}">
  </td></tr></table>
  <p class="dim" style="margin:10px 0 28px;text-align:center;font:400 13px/1.5 ${FONT};color:${DIM}">${escape(w.caption)}</p>
  <h1 class="ink" style="margin:0 0 16px;font:800 28px/1.2 ${DISPLAY};color:${INK}">${escape(w.hi)}</h1>
  ${w.paragraphs.map((p, i) => `<p class="ink" style="margin:0 0 ${i === w.paragraphs.length - 1 ? 28 : 16}px;font:400 16px/1.6 ${FONT};color:${INK}">${escape(p)}</p>`).join("\n  ")}
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#1B61B2;background-image:linear-gradient(#236DC4,#1B61B2 45%,#134B8C);border-bottom:4px solid #104078;box-shadow:inset 0 1px 0 rgba(255,255,255,.45)">
    <a href="${w.button.href}" style="display:inline-block;padding:16px 26px;font:700 14px/1 ${FONT};letter-spacing:1.3px;text-transform:uppercase;color:#E9F0FA;text-decoration:none">${escape(w.button.label)}</a>
  </td></tr></table>
  <p class="dim" style="margin:28px 0 24px;font:400 14px/1.6 ${FONT};color:${DIM}">${keep}</p>
  <p class="ink" style="margin:0;font:400 16px/1.6 ${FONT};color:${INK}">Thank you, truly.<br><strong>Noor</strong></p>
</td></tr>
<tr><td class="dim" style="padding:20px 8px 0;font:400 12px/1.6 ${FONT};color:${DIM}">You’re getting this because you just supported Echo UI. Questions? Just reply.<br><a href="${site}" style="color:${DIM}">${new URL(site).host}</a></td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { subject: w.subject, text, html, link };
}

const welcomeLink = (site: string, session: string) => `${site}/supporters/welcome?session_id=${encodeURIComponent(session)}`;
const placeOf = (plan: "monthly" | "once") => (plan === "monthly" ? "in the village round my hill" : "out in the meadows");

/** The first: their Echo has a spot waiting, and here's how it moves in. */
export function thankYou(site: string, session: string, plan: "monthly" | "once") {
  const link = welcomeLink(site, session);
  return letter(site, link, {
    subject: "Thank you for supporting Echo",
    preheader: "Your Echo has a spot waiting on the island.",
    caption: "Echo’s been practicing that jump for you.",
    hi: "Hi, it’s Noor here.",
    paragraphs: [
      "I build Echo on my own, so this means more than you’d think. Your support keeps Echo free for everyone, and it keeps me building.",
      `Your Echo already has a spot waiting on the island, ${placeOf(plan)}. Give it a name and up to two links, and it moves in.`,
    ],
    button: { label: "Put my Echo on the island", href: link },
    keep: "Keep this email: the same link lets you change your Echo’s name or links whenever you like. It only works for you, so keep it to yourself.",
  });
}

/** How many times, said the way a person would. */
export const timesSaid = (n: number) => (n === 2 ? "twice" : `${n} times`);

/** Supporting again: what it did for the Echo already on the island, and how many times they've supported now. */
export function thankYouAgain(site: string, session: string, echo: { name: string; id: string; plan: "monthly" | "once"; times: number; woke: boolean }) {
  const link = welcomeLink(site, session);
  const name = echo.name;
  const card = `its card now says you’ve supported Echo ${timesSaid(echo.times)}`;
  const two =
    echo.plan === "monthly"
      ? `${name} lives ${placeOf("monthly")} for as long as you support monthly, and ${card}.`
      : echo.woke
        ? `${name} just woke up: it’s awake on the island for 30 days, ${placeOf("once")}, and ${card}.`
        : `${name} has another 30 days awake on the island, ${placeOf("once")}, and ${card}.`;
  return letter(site, link, {
    subject: "Thank you for supporting Echo again",
    preheader: echo.woke ? `${echo.name} just woke up.` : `${echo.name}’s card just went up by one.`,
    caption: "Echo did the jump again. It’s been practicing.",
    hi: "Hi, it’s Noor again.",
    paragraphs: ["You supported Echo again. Thank you, truly: it keeps Echo free for everyone, and it keeps me building.", two],
    button: { label: "See my Echo", href: `${site}/supporters#${encodeURIComponent(echo.id)}` },
    keep: "To change your Echo’s name or links, open {link}. It only works for you, so keep it to yourself.",
  });
}
