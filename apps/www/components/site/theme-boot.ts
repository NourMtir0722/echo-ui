/**
 * The server-safe half of theme-store.ts: the storage names and the script
 * the root layout inlines into <head>. Kept apart because the layout is a
 * Server Component and theme-store holds a client hook.
 */
export const THEME_STORAGE_KEY = "echo-site-theme";
export const THEME_STYLE_ID = "echo-site-theme";
/**
 * On <html> once the visitor has picked a colour. A page may open on a colour
 * of its own until then (the homepage opens on Sky): its theme is scoped to
 * `:root:not([data-seed-chosen])`, so a choice always wins.
 */
export const SEED_CHOSEN_ATTR = "data-seed-chosen";
/**
 * On <html> while the site wears a drawn look (Ink Instrument): the site's own
 * pieces that aren't Echo components (the hero's device, the 2D and 3D Echo,
 * the road, the cards) draw themselves in the ink under it. Echo's components
 * draw themselves from the theme alone.
 */
export const DRAWN_ATTR = "data-drawn";

/**
 * Puts the visitor's saved theme back before first paint. Plain ES5, no
 * imports: it runs before React and before any bundle, which is also why
 * what is saved is the finished CSS and not just the seed — this script
 * cannot run the OKLCH derivation. A saved choice of the default seed has no
 * CSS to put back, but it's still a choice, so it still marks <html>.
 */
export const THEME_BOOT_SCRIPT = `try{var v=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"null");if(v&&typeof v.css==="string"&&v.css.indexOf("<")<0){document.documentElement.setAttribute(${JSON.stringify(SEED_CHOSEN_ATTR)},"");if(v.css.indexOf("--echo-drawn: 1;")>=0)document.documentElement.setAttribute(${JSON.stringify(DRAWN_ATTR)},"");if(v.css){var s=document.createElement("style");s.id=${JSON.stringify(THEME_STYLE_ID)};s.textContent=v.css;document.head.appendChild(s)}}}catch(e){}`;
