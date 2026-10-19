/**
 * The axe rules Echo's page tests run, by id.
 *
 * `npx echo-ui-cli test`, `check --url` and the Stop gate run axe-core on each
 * page with the WCAG 2.0, 2.1 and 2.2 A and AA tags: Echo's floor. These are
 * the rules that run under them, less the ones axe itself leaves out by
 * default (its experimental and deprecated rules) and less `color-contrast`,
 * which Echo's own `contrast` measures (text on gradients and the material
 * included, which axe skips).
 *
 * They're data here, not read from axe-core, so the registry and echo.json's
 * schema don't depend on it: echo.json's `check.rules` takes `axe:<id>` for
 * each one, and a name that isn't one fails loudly. A test in the CLI holds
 * the list equal to what its pinned axe-core runs.
 */

/** The tags axe runs with: WCAG 2.0, 2.1 and 2.2, A and AA. */
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

export const AXE_RULES = [
  "area-alt", "aria-allowed-attr", "aria-braille-equivalent", "aria-command-name",
  "aria-conditional-attr", "aria-deprecated-role", "aria-hidden-body", "aria-hidden-focus",
  "aria-input-field-name", "aria-meter-name", "aria-progressbar-name", "aria-prohibited-attr",
  "aria-required-attr", "aria-required-children", "aria-required-parent", "aria-roles",
  "aria-tab-name", "aria-toggle-field-name", "aria-tooltip-name", "aria-valid-attr",
  "aria-valid-attr-value", "autocomplete-valid", "avoid-inline-spacing", "blink", "button-name",
  "bypass", "definition-list", "dlitem", "document-title", "duplicate-id-aria",
  "form-field-multiple-labels", "frame-focusable-content", "frame-title", "frame-title-unique",
  "html-has-lang", "html-lang-valid", "html-xml-lang-mismatch", "image-alt", "input-button-name",
  "input-image-alt", "label", "label-content-name-mismatch", "link-in-text-block", "link-name", "list", "listitem", "marquee",
  "meta-refresh", "meta-viewport", "nested-interactive", "no-autoplay-audio", "object-alt",
  "role-img-alt", "scrollable-region-focusable", "select-name", "server-side-image-map",
  "summary-name", "svg-img-alt", "target-size", "td-headers-attr", "th-has-data-cells",
  "valid-lang", "video-caption",
] as const;
export type AxeRule = (typeof AXE_RULES)[number];

/**
 * The rules that ask for a control's name, which Echo's own `name` asks too.
 * When `name` has already said it of an element, axe's finding on that same
 * element is the same problem said twice, and only Echo's is kept.
 */
export const AXE_NAME_RULES: readonly AxeRule[] = [
  "button-name",
  "link-name",
  "label",
  "input-button-name",
  "select-name",
  "summary-name",
  "aria-command-name",
  "aria-input-field-name",
  "aria-meter-name",
  "aria-progressbar-name",
  "aria-tab-name",
  "aria-toggle-field-name",
  "aria-tooltip-name",
];
