/**
 * Which Echo item does a job: the answer behind the CLI's `which` and the top
 * of the MCP server's `search_components`, from one function so the two can
 * never say different things.
 *
 * A word search alone answers the wrong question. "A date picker" shares a
 * word with DateTile, which shows a date and picks nothing, and "a settings
 * toggle" names Toggle, a toolbar key, when the job is Switch. So the answer
 * comes from the words people actually use for UI jobs first (JOBS), then from
 * a confident match on an item's own name, and never from a word that merely
 * appears somewhere. When nothing fits, the answer says so: an agent handed
 * the nearest word match builds the wrong thing with confidence.
 */
import { getComponent, rankComponents, type CatalogComponent, type RegistryCatalog } from "./catalog";

export interface Job {
  /** What people call the job: "settings toggle", "confirm delete". */
  says: readonly string[];
  /** The items that do it, best first, by bare name. */
  items: readonly string[];
}

export interface Gap {
  says: readonly string[];
  /** What to tell someone who asked for it. */
  note: string;
}

export const JOBS: readonly Job[] = [
  { says: ["button", "submit button", "primary button", "cta", "call to action", "action button", "icon button", "sign up button", "save button", "main action", "primary action", "second action", "secondary action"], items: ["hardware-button"] },
  { says: ["save with progress", "saving button", "button with progress"], items: ["save-button"] },
  { says: ["toggle button", "pressed button", "bold button", "formatting button"], items: ["toggle"] },
  { says: ["button group", "toolbar", "group of buttons"], items: ["toolbar"] },
  { says: ["switch", "toggle switch", "settings toggle", "on off", "enable disable", "notification toggle", "preference toggle", "toggle a setting", "notification preferences", "notification settings", "email preferences", "email notifications", "turn on or off"], items: ["switch"] },
  { says: ["frequency", "how often", "one of a few options", "among a few options", "one of a few", "among a few", "daily weekly"], items: ["segmented", "radio-group", "select"] },
  { says: ["settings grid", "permissions grid", "switch table"], items: ["switch-bank"] },
  { says: ["checkbox", "check box", "tick box", "agree to terms", "accept terms", "opt in"], items: ["checkbox"] },
  { says: ["checkbox list", "checkbox group", "multiple choice", "choose several"], items: ["checkbox-group"] },
  { says: ["radio", "radio buttons", "radio group", "single choice", "pick one", "choose one"], items: ["radio-group", "segmented"] },
  { says: ["segmented control", "view switcher", "monthly yearly", "billing period", "billing toggle", "period switch", "yearly toggle", "annual toggle", "row of choices", "row of options", "one is chosen", "choice pills", "switch between", "toggle between", "monthly and annual", "monthly and yearly"], items: ["segmented"] },
  { says: ["plan picker", "pick a plan", "choice cards", "option cards", "selectable cards"], items: ["choice-cards"] },
  { says: ["dropdown", "select", "select menu", "choose from a list", "picker", "in a dropdown", "options in a dropdown", "one of many", "many options"], items: ["select"] },
  { says: ["searchable dropdown", "autocomplete", "typeahead", "combo box", "combobox", "multi select", "multiselect"], items: ["combobox"] },
  { says: ["text input", "input", "text field", "text box", "email field", "email input", "password field", "password input", "name field", "form field", "search box", "search input", "search field", "search bar", "url field", "phone field"], items: ["field"] },
  { says: ["textarea", "text area", "message box", "comment box", "multi line", "multiline", "bio field", "description field"], items: ["textarea"] },
  { says: ["number input", "number field", "quantity", "stepper input", "quantity picker", "counter input"], items: ["number-field"] },
  { says: ["slider", "range input", "volume slider", "0 to 100", "from 0 to", "an amount from", "a level from"], items: ["slider"] },
  { says: ["price range", "range slider", "min max", "two handle slider", "dual slider"], items: ["range-slider"] },
  { says: ["knob", "dial", "rotary", "volume knob"], items: ["knob", "jog-wheel"] },
  { says: ["one time code", "one-time code", "otp", "verification code", "2fa", "two factor", "sms code", "pin code"], items: ["otp-field"] },
  { says: ["keypad", "pin pad", "numpad", "number pad", "dial pad"], items: ["keypad"] },
  { says: ["tags input", "tag input", "chips input", "add tags", "labels input"], items: ["tags-input"] },
  { says: ["tag", "chip", "removable label"], items: ["tag"] },
  { says: ["badge", "status label", "label", "pill"], items: ["badge"] },
  { says: ["status word", "status tag", "state in words", "status in words", "flight status", "order status", "booking status", "says a state", "shows a state"], items: ["badge", "annunciator"] },
  { says: ["unread count", "notification count", "count badge", "counter badge"], items: ["count-badge"] },
  { says: ["form", "form validation", "error summary", "sign up form", "signup form", "login form", "sign in form", "settings form", "contact form"], items: ["form", "field"] },
  { says: ["fieldset", "group of fields", "field group"], items: ["fieldset"] },
  { says: ["modal", "dialog", "popup", "pop up", "lightbox"], items: ["modal"] },
  { says: ["confirm delete", "confirm a delete", "delete confirmation", "destructive confirm", "are you sure", "confirm dialog", "confirmation dialog", "confirm destructive", "delete account", "delete button", "remove account", "cancel subscription"], items: ["alert-dialog", "confirm-button", "hold-button"] },
  { says: ["with confirmation", "abandon", "confirm before", "second press"], items: ["confirm-button", "alert-dialog"] },
  { says: ["drawer", "side panel", "slide over", "slide-over", "off canvas", "mobile menu", "bottom sheet", "sheet"], items: ["sheet"] },
  { says: ["dropdown menu", "context menu", "overflow menu", "kebab menu", "more actions", "actions menu", "menu"], items: ["menu"] },
  { says: ["popover"], items: ["popover"] },
  { says: ["tooltip", "hover hint"], items: ["tooltip"] },
  { says: ["command palette", "cmd k", "command menu", "quick search", "spotlight"], items: ["command"] },
  { says: ["toast", "snackbar", "saved message", "success message", "confirmation message", "flash message", "notification toast", "when saved", "on save", "settings saved", "message when saved", "show a message", "message", "saved", "announce", "was copied", "copied", "tell the user"], items: ["toast"] },
  { says: ["error message", "field error", "validation error", "validation message", "inline error", "help text", "hint text"], items: ["field", "form"] },
  { says: ["notification center", "notifications inbox", "inbox", "bell"], items: ["notification-center"] },
  { says: ["banner", "inline alert", "alert banner", "warning message", "error banner", "announcement bar"], items: ["banner"] },
  { says: ["spinner", "loading spinner", "loading indicator", "loader", "typing indicator"], items: ["loader"] },
  { says: ["progress bar", "progress", "upload progress", "completion bar"], items: ["progress"] },
  { says: ["skeleton", "loading placeholder", "placeholder loading", "shimmer", "loading state"], items: ["skeleton", "loader"] },
  { says: ["empty state", "no results", "nothing here", "zero state", "empty"], items: ["empty-state"] },
  { says: ["status dot", "online indicator", "status indicator", "presence dot"], items: ["status-dot"] },
  { says: ["stat card", "stats card", "stat cards", "kpi", "kpi card", "metric card", "metric", "big number", "dashboard stat", "stat tile", "revenue card", "change from last month", "month over month", "delta", "trend indicator"], items: ["stat-tile"] },
  { says: ["inline metric", "inline stat", "small readout", "readout", "value readout", "numeric readout", "a reading"], items: ["lcd-chip", "stat-tile"] },
  { says: ["chart", "graph", "bar chart", "sparkline", "trend"], items: ["chart"] },
  { says: ["table", "data table", "orders table", "users table", "list of orders", "grid of data", "datagrid", "sortable table", "sort a table", "table with checkboxes", "select rows", "bulk select", "filter a table", "searchable table", "virtual table", "virtualized table", "table with thousands of rows", "sticky header table"], items: ["table"] },
  { says: ["key value", "key value list", "details list", "definition list", "description list", "properties list", "label and value", "label value", "name and value", "term and value"], items: ["description-list"] },
  { says: ["list", "list item", "list row", "settings row", "row with actions", "row with a control", "label and a control", "feature list", "features list", "checklist"], items: ["item"] },
  { says: ["card", "pricing card", "plan card", "feature card", "product card", "profile card"], items: ["card", "panel"] },
  { says: ["panel", "container", "section box", "surface", "group related content", "group of content", "content group"], items: ["panel"] },
  { says: ["accordion", "faq", "expandable sections", "collapsible sections", "frequently asked questions", "questions expandable"], items: ["accordion"] },
  { says: ["collapsible", "disclosure", "show more", "expand collapse"], items: ["collapsible"] },
  { says: ["divider", "separator", "horizontal rule", "hr"], items: ["divider"] },
  { says: ["layout", "stack", "grid layout", "spacing", "section layout", "page section layout"], items: ["layout"] },
  { says: ["app shell", "dashboard layout", "sidebar layout", "app frame", "app layout", "top bar", "left rail"], items: ["app-shell"] },
  { says: ["sidebar", "side nav", "side navigation", "sidebar navigation", "sidebar menu", "site navigation", "navigation with current page"], items: ["side-nav", "app-shell"] },
  { says: ["bottom nav", "bottom navigation", "tab bar", "mobile nav", "mobile navigation"], items: ["tab-bar"] },
  { says: ["tabs", "tab", "tabbed"], items: ["tabs"] },
  { says: ["breadcrumb", "breadcrumbs"], items: ["breadcrumb"] },
  { says: ["pagination", "pager", "page numbers"], items: ["pagination"] },
  { says: ["steps", "stepper", "wizard", "progress steps", "onboarding steps", "checkout steps"], items: ["steps"] },
  { says: ["link", "text link"], items: ["link"] },
  { says: ["avatar", "profile picture", "profile photo", "user photo", "user avatar", "user initials", "initials chip", "round chip", "person chip", "people chips"], items: ["avatar"] },
  { says: ["keyboard shortcut", "kbd", "key hint"], items: ["kbd"] },
  { says: ["shortcut list", "shortcuts", "keyboard shortcuts list", "shortcut map"], items: ["shortcut-map"] },
  { says: ["scroll area", "scrollable", "scroll region", "scroll container"], items: ["scroll-area"] },
  { says: ["pull to refresh", "pull down to refresh"], items: ["pull-to-refresh"] },
  { says: ["theme", "colors", "colours", "brand color", "brand colour", "design tokens", "color tokens"], items: ["theme"] },
  { says: ["sound", "click sound", "audio feedback"], items: ["sound"] },
  { says: ["animation", "motion", "transition"], items: ["motion"] },
  { says: ["timer", "countdown"], items: ["timer"] },
  { says: ["stopwatch", "lap timer"], items: ["stopwatch"] },
  { says: ["voice note", "record audio", "voice recorder", "audio recorder"], items: ["voice-note"] },
  { says: ["add to cart", "add to bag", "add to basket"], items: ["add-to-bag"] },
  { says: ["mark as done", "done button", "complete task"], items: ["done-button"] },
  { says: ["hold to confirm", "press and hold"], items: ["hold-button"] },
  { says: ["dashboard", "admin dashboard", "analytics dashboard", "dashboard template", "control panel"], items: ["console", "app-shell", "stat-tile"] },
  { says: ["chat", "messaging", "conversation", "chatbot", "chat ui", "chat screen", "ai chat", "message thread", "messages screen"], items: ["chat"] },
  { says: ["music player", "media player", "audio player", "now playing"], items: ["now-playing"] },
  { says: ["receipt", "order summary"], items: ["receipt"] },
  { says: ["ticket", "boarding pass", "event ticket"], items: ["ticket"] },
  { says: ["week view", "week strip", "day picker", "pick a day"], items: ["week-strip"] },
  { says: ["today's date", "date display", "desk calendar"], items: ["date-tile"] },
  { says: ["date picker", "datepicker", "date input", "date field", "pick a date", "choose a date", "date of birth", "birthday field", "due date", "start date", "end date"], items: ["date-picker", "date-field"] },
  { says: ["calendar", "month view", "inline calendar", "booking calendar", "availability calendar", "calendar grid", "choose a day"], items: ["calendar"] },
  { says: ["file upload", "file input", "upload", "upload files", "dropzone", "drop zone", "file picker", "image upload", "attachment upload", "attach files", "attachments"], items: ["file-upload"] },
  { says: ["quick settings", "quick tile", "control center tile"], items: ["quick-tile"] },
  { says: ["gauge", "meter", "capacity", "usage meter", "storage meter", "fills like liquid", "liquid level", "liquid gauge", "a level that fills"], items: ["meter", "fill-slider"] },
  { says: ["level meter", "audio meter", "vu meter", "volume meter"], items: ["level-meter"] },
  { says: ["widgets", "widget grid", "draggable widgets"], items: ["widget-grid"] },
  { says: ["filters", "filter bar", "filter chips"], items: ["filter-tray"] },
  { says: ["digital readout", "seven segment", "led display", "clock display"], items: ["segment-display"] },
  { says: ["departures board", "departure board", "departure time", "flip board", "flip display", "flip clock", "flips", "turns over"], items: ["split-flap"] },
];

/**
 * Jobs Echo has nothing for yet, named so the answer is "not yet" or "coming
 * soon" rather than the nearest word match: an image slider isn't Slider.
 */
export const GAPS: readonly Gap[] = [
  // Not built yet, and coming before launch.
  { says: ["color picker", "colour picker", "color input", "colour input"], note: "Echo has no colour picker yet." },
  { says: ["sortable list", "drag and drop list", "reorderable list", "reorder items"], note: "Echo has no sortable list yet." },
  { says: ["tree", "tree view", "file tree", "nested tree"], note: "Echo has no tree view yet." },
  { says: ["timeline", "activity timeline"], note: "Echo has no timeline yet." },
  { says: ["rating", "star rating", "stars rating", "review stars"], note: "Echo has no rating control yet." },
  // Coming soon: named, and not in the first release.
  { says: ["date range", "date range picker", "check in check out", "time picker", "time input", "time field", "datetime", "date time"], note: "A time field and a date range picker are coming soon. For one date, DatePicker." },
  { says: ["scheduler", "event calendar", "week calendar", "schedule view", "appointment calendar"], note: "A scheduler is coming soon. For choosing one day, Calendar." },
  { says: ["kanban", "kanban board", "trello"], note: "Kanban is coming soon." },
  { says: ["carousel", "image slider", "image carousel", "slideshow", "gallery slider"], note: "A carousel is coming soon." },
  { says: ["phone input", "phone number input", "international phone"], note: "A phone-number input is coming soon; a Field with autoComplete=\"tel\" takes a number today." },
  { says: ["reasoning trace", "chain of thought", "thinking steps", "agent reasoning"], note: "A reasoning trace is coming soon." },
  { says: ["cost meter", "token meter", "token usage", "token count"], note: "A cost meter is coming soon; Meter shows a share of a whole today." },
  { says: ["citations", "source citations", "sources list", "footnotes"], note: "Citations are coming soon." },
  { says: ["diff", "diff view", "code diff", "text diff"], note: "A diff view is coming soon." },
  { says: ["transport controls", "playback controls", "play pause controls"], note: "Transport controls are coming soon; NowPlaying has play and pause today." },
  { says: ["menubar", "menu bar", "app menu bar"], note: "A menubar is coming soon. For a menu from one button, Menu." },
  { says: ["resizable panes", "resizable panels", "split pane", "split view", "splitter"], note: "Resizable panes are coming soon." },
  { says: ["hover card", "hover preview", "profile hover card"], note: "A hover card is coming soon; Popover opens on press today." },
  { says: ["window chrome", "window frame", "title bar", "traffic lights"], note: "Window chrome is coming soon." },
  { says: ["status bar", "app status bar"], note: "A status bar is coming soon." },
  { says: ["fader", "mixer fader", "channel fader"], note: "A fader is coming soon; Slider is a rail you drag today." },
  // Not planned.
  { says: ["heading text", "a heading", "headline", "title text", "section heading"], note: "Echo has no heading part. Set a heading in a text style: `font: var(--echo-type-heading)`, or `var(--echo-type-display)` for the one large line a screen carries." },
  { says: ["icon set", "line icons", "icon library", "app icons"], note: "Echo draws its components' own glyphs. For the app's icons it recommends Lucide (`lucide-react`), at the icon sizes (`--echo-icon-*`), one stroke weight throughout." },
  { says: ["section label", "label over", "machine label", "eyebrow", "legend over"], note: "Echo has no label part. Print it in the machine-label text style, `font: var(--echo-type-machine-label)` with its case and tracking; a field's own label is Field's `label`." },
  { says: ["code block", "block of code", "code snippet", "show code", "code to copy"], note: "Echo has no code block. Put a <pre> in a Panel variant=\"screen\", in var(--echo-font-mono), with a HardwareButton that copies it." },
  { says: ["rich text", "rich text editor", "wysiwyg", "markdown editor", "text editor"], note: "Echo has no rich text editor." },
  { says: ["map", "map view"], note: "Echo has no map." },
  { says: ["photo frame", "image frame", "photo", "photograph", "hero image", "cover image", "picture"], note: "Echo has no image part. Put an <img> (or next/image) inside a Panel, with its radius from var(--echo-radius-*), and give it real alt text." },
  { says: ["navbar", "nav bar", "top navigation", "top nav", "header nav", "navigation bar", "site header"], note: "Echo has no top navigation bar. Its app navigation is AppShell with SideNav, or TabBar on a phone." },
  { says: ["hero", "hero section", "footer", "landing section", "page section", "call to action section", "testimonials", "pricing table"], note: "Echo has no page sections. Lay them out yourself with Layout, Panel and Card, styled only with var(--echo-*)." },
];

/** Words that say nothing about which item, as the search reads them. */
const FILLER = new Set(["a", "an", "the", "for", "with", "of", "to", "and", "or", "in", "on", "that", "my", "i", "component", "echo", "ui", "some", "new", "nice"]);

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Lower case, words only, each plural reduced, so "Stat cards" meets "stat card". */
function words(text: string): string[] {
  return text
    .toLowerCase()
    // A possessive is one word: "the app's frame" is the app frame.
    .replace(/['’]s\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

/** How many words of `phrase` appear, in order and together, in `need`; 0 when it doesn't. */
function phraseLength(need: readonly string[], phrase: string): number {
  const p = words(phrase);
  for (let i = 0; i + p.length <= need.length; i++) {
    if (p.every((w, j) => need[i + j] === w)) return p.length;
  }
  return 0;
}

export interface Fit {
  component: CatalogComponent;
  /** Why it fits, in one line: its own summary. */
  reason: string;
}

export interface Answer {
  need: string;
  /** Best first, at most three. Empty when nothing in Echo does the job. */
  fits: Fit[];
  /** Set when the job is one Echo doesn't do yet. */
  gap?: string;
}

/** The first sentence of an item's summary, as the reason it fits. */
function reasonFor(c: CatalogComponent): string {
  const text = (c.summary ?? c.description).replace(/\s+/g, " ").trim();
  const sentence = /^.*?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

/**
 * The items that do a job, best first. The longest phrase in the need
 * decides: "image slider" is a carousel Echo doesn't have, "upload progress"
 * is Progress. An item's own name, said whole ("hardware button"), always
 * fits; a single shared word never does on its own.
 */
export function answerNeed(catalog: RegistryCatalog, need: string): Answer {
  const said = words(need);
  let jobLength = 0;
  let jobs: Job[] = [];
  for (const job of JOBS) {
    const length = Math.max(0, ...job.says.map((p) => phraseLength(said, p)));
    if (length > jobLength) {
      jobLength = length;
      jobs = [job];
    } else if (length && length === jobLength) {
      jobs.push(job);
    }
  }
  let gap: Gap | undefined;
  let gapLength = 0;
  for (const g of GAPS) {
    const length = Math.max(0, ...g.says.map((p) => phraseLength(said, p)));
    if (length > gapLength) [gap, gapLength] = [g, length];
  }

  const ranked = rankComponents(catalog, need);
  // The need says an item's whole name: "the hardware button", "a date tile".
  const asked = compact(said.filter((w) => !FILLER.has(w)).join(""));
  const named = catalog.components.filter((c) => asked && (compact(c.title) === asked || compact(c.name.replace(/^echo-/, "")) === asked));
  if (gap && gapLength >= jobLength && named.length === 0) return { need, fits: [], gap: gap.note };

  const picked: CatalogComponent[] = [...named];
  for (const job of jobs) {
    for (const item of job.items) {
      const c = getComponent(catalog, `echo-${item}`) ?? getComponent(catalog, item);
      if (c) picked.push(c);
    }
  }
  // Only when the vocabulary has nothing to say: confident matches on an
  // item's own name. Next to a known job they'd only dilute the answer.
  if (jobs.length === 0) for (const r of ranked) if (r.strong) picked.push(r.component);

  const fits = [...new Map(picked.map((c) => [c.name, c])).values()].slice(0, 3).map((component) => ({ component, reason: reasonFor(component) }));
  return fits.length ? { need, fits } : { need, fits: [], ...(gap ? { gap: gap.note } : {}) };
}
