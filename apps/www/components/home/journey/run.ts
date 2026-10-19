/**
 * What the journey quotes: one recorded run of Echo's plugin in Codex, on one
 * board, word for word.
 *
 * The run's own board held other people's work (campaigns, product shots), so
 * the page shows a board of the same two looks instead, every image free to
 * use and credited (BOARD_CREDITS: photos from Unsplash, drawings in the
 * public domain). The replies were written about the run's own board.
 *
 * Nothing here is written to look like a reply. Every string is the reply, or
 * the tool's output, as it came, and it's only ever trimmed where it says
 * "…". The two style files are the run's own `style.json`, cut to what the
 * page shows.
 */
import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";

/** Where the run happened, said in plain text: no other product's interface or logo. */
export const WHERE = "In Codex, with Echo's plugin";

/**
 * The board: a stand-in for the run's, in its two looks and in its order (see
 * above). `group`: the run's style each tile stands in for, as the run's own
 * sampling grouped the tile it replaces.
 */
export const BOARD: readonly { src: string; alt: string; group: "ink" | "pigment"; w: number; h: number }[] = [
  { src: "objects-grid", alt: "Small metal parts laid out in rows on white", group: "ink", w: 640, h: 480 },
  { src: "grass-blur", alt: "Blades of grass, sharp at the front, the trees behind out of focus", group: "pigment", w: 640, h: 480 },
  { src: "geometry-plate", alt: "A plate of geometric line drawings: cubes, ellipses and concentric rings", group: "ink", w: 458, h: 640 },
  { src: "bokeh", alt: "Out-of-focus lights in blue, pink and gold", group: "pigment", w: 640, h: 480 },
  { src: "shuttle-elevations", alt: "Line elevations of the Space Shuttle launch stack, side by side", group: "ink", w: 486, h: 333 },
  { src: "camera", alt: "A silver film camera, close up", group: "ink", w: 640, h: 480 },
  { src: "leaf-drop", alt: "A leaf with a drop of water at its tip, on blurred green", group: "pigment", w: 640, h: 480 },
  { src: "bridge-isometric", alt: "Isometric drawings of a covered bridge's framing", group: "ink", w: 499, h: 392 },
  { src: "faders", alt: "A finger on the faders of a mixing desk", group: "ink", w: 640, h: 480 },
  { src: "horizon", alt: "A soft horizon, pink cloud fading into blue", group: "pigment", w: 640, h: 480 },
  { src: "clock-dial", alt: "A black and white clock face, close up", group: "ink", w: 640, h: 480 },
  { src: "wheat", alt: "Green wheat in shallow focus", group: "pigment", w: 640, h: 480 },
  { src: "shuttle-isometric", alt: "An isometric line drawing of the Space Shuttle launch stack", group: "ink", w: 486, h: 333 },
  { src: "pink-forest", alt: "A path between trees in a pale pink mist", group: "pigment", w: 640, h: 480 },
  { src: "lunar-module", alt: "A labelled line drawing of the lunar module", group: "ink", w: 472, h: 640 },
  { src: "isometric-section", alt: "Isometric and section drawings of an aqueduct", group: "ink", w: 482, h: 630 },
];

export const boardSrc = (name: string) => `/journey-board/${name}.jpg`;

/** Whose each image is, and on what terms: shown under the board. */
export const BOARD_CREDITS: readonly { image: string; by: string; href: string; terms: string }[] = [
  { image: "Small parts in rows", by: "Florian Klauer", href: "https://unsplash.com/photos/-K6JMRMj4x4", terms: "Unsplash" },
  { image: "Grass", by: "Vectorbeast", href: "https://unsplash.com/photos/rsJtMXn3p_c", terms: "Unsplash" },
  { image: "Geometry plate", by: "William Farish, 1822", href: "https://commons.wikimedia.org/wiki/File:Transactions01camb_0057.jpg", terms: "public domain" },
  { image: "Lights", by: "Sebastian Muller", href: "https://unsplash.com/photos/VLdaxYyXJvw", terms: "Unsplash" },
  { image: "Shuttle elevations", by: "Joseph Klimek, Historic American Engineering Record", href: "https://commons.wikimedia.org/wiki/File:Elevations_of_the_Space_Shuttle_Launch_Stack_Assembly_-_Space_Transportation_System,_Lyndon_B._Johnson_Space_Center,_2101_NASA_Parkway,_Houston,_Harris_County,_TX_HAER_TX-116_(sheet_3_of_6).tif", terms: "public domain" },
  { image: "Camera", by: "Nicola Perantoni", href: "https://unsplash.com/photos/irUQaBK3ydI", terms: "Unsplash" },
  { image: "Leaf", by: "Shyamanta Baruah", href: "https://unsplash.com/photos/kxqvE41_07k", terms: "Unsplash" },
  { image: "Bridge framing", by: "John C. Fletcher, Historic American Buildings Survey", href: "https://commons.wikimedia.org/wiki/File:Elevation,_Roof_Plan,_Isometric_of_Lower_Stringer_Framing,_Isometric_of_Upper_Stringer_Framing_-_Covered_Bridge,_Spanning_Connecticut_River,_Orford,_Grafton_County,_NH_HABS_NH,5-ORF,2-_(sheet_1_of_5).png", terms: "public domain" },
  { image: "Faders", by: "Drew Patrick Miller", href: "https://unsplash.com/photos/_o6AAx9dl_Y", terms: "Unsplash" },
  { image: "Horizon", by: "Kelly Sikkema", href: "https://unsplash.com/photos/X7dy114KWs4", terms: "Unsplash" },
  { image: "Clock", by: "petradr", href: "https://unsplash.com/photos/8hgm6mKK04U", terms: "Unsplash" },
  { image: "Wheat", by: "Lukas Schweizer", href: "https://unsplash.com/photos/9VWOr22LhVI", terms: "Unsplash" },
  { image: "Shuttle isometric", by: "John Wachtel, Historic American Engineering Record", href: "https://commons.wikimedia.org/wiki/File:Full_isometric_view_of_the_Space_Shuttle_Launch_Stack_Assembly_-_Space_Transportation_System,_Lyndon_B._Johnson_Space_Center,_2101_NASA_Parkway,_Houston,_Harris_County,_TX_HAER_TX-116_(sheet_2_of_6).tif", terms: "public domain" },
  { image: "Misty path", by: "Simon Pape", href: "https://unsplash.com/photos/2kc8bigeqEI", terms: "Unsplash" },
  { image: "Lunar module", by: "NASA", href: "https://commons.wikimedia.org/wiki/File:LEM-linedrawing.png", terms: "public domain" },
  { image: "Aqueduct", by: "Historic American Engineering Record", href: "https://commons.wikimedia.org/wiki/File:Photocopied_December_1977,_from_loose,_original_drawings,_Jervis_Library._AQUEDUCT_NEAR_SAW_MILL_RIVER,_SECTIONS_AND_ISOMETRIC._-_Old_Croton_Aqueduct,_New_York,_New_York_County,_HAER_NY,31-NEYO,87-30.tif", terms: "public domain" },
];

/* --- 1 · Make a style ------------------------------------------------------- */

export const MAKE = {
  prompt: "Here's my mood board, analyze it",
  working: "I’m using Echo UI’s design-eye skill to read the board’s visual patterns and turn them into a practical design direction.",
  reading:
    "The board has three distinct strands: technical spec sheets, blurred organic colour, and playful graphic experiments. The strongest shared idea is precision with one expressive interruption—small labels and strict grids give the softer imagery and bright colour room to stand out.",
  questions: [
    {
      q: "For the reusable style, I suggest a pale ground with black ink, keeping colour in imagery until a product accent is chosen. … Which direction do you want?",
      options: ["Neutral controls; colour in imagery", "Blue accent", "Green accent"],
      answer: 0,
    },
    {
      q: "I suggest reading the blurred nature and pigment references as a separate companion style, because their softness differs from the technical layouts. How should they contribute?",
      options: ["Separate companion style", "Imagery within the technical style", "Make the organic style dominant"],
      answer: 0,
    },
    {
      q: "The board supports both outlined technical controls and shaded physical controls. I suggest drawn outlines as the main Echo treatment, based on the diagrams, pills, and spec sheets. Which should lead?",
      options: ["Drawn technical controls", "Molded physical controls"],
      answer: 0,
    },
  ],
  answered:
    "Your choices make the direction clear: neutral, drawn controls form the main system; blurred nature and pigment become a separate companion style.",
  idea: "Your board’s strongest idea is",
  ideaBold: "precision with an expressive interruption",
  ideaRest:
    ": strict grids, fine outlines and small factual labels create order; blurred imagery, vivid colour or oversized type supplies the emotion.",
  saved: "I saved two illustrated foundations with sampled colours, design rules and Echo style files.",
  /** The files the reply linked: its analysis index and the foundations (`name`, as the run wrote it), shown as documents. */
  files: [
    { name: "moodboard-analysis/INDEX.md", title: "Mood board analysis", kind: "doc" },
    { name: "moodboard-foundations.zip", title: "Mood board foundations", kind: "zip" },
  ],
} as const;

/** The two styles the run found, from its own files. */
export const INK = {
  name: "ink-instrument",
  title: "Ink Instrument",
  essence: "Pale technical sheets, precise ink outlines and editorial scale changes; colour belongs to the specimen.",
  role: "The main interface",
  fingerprint: "W2 V2 D3 F4 E3 C5 O2",
  /** From its foundation's "Dominant values" table: tile, value, share of the tile's pixels. */
  values: [
    { tile: "nodes", hex: "#F3F3F3", share: "91.99%" },
    { tile: "future-now", hex: "#EBEBEB", share: "90.25%" },
    { tile: "future-now", hex: "#1C1C1C", share: "1.85%" },
    { tile: "nodes", hex: "#0495FB", share: "1.28%" },
  ],
  /** From the foundation, Part I. */
  excerpt: [
    {
      head: "Pale technical sheet.",
      body: "Nodes is 91.99% sampled #F3F3F3; Future/Now is 90.25% #EBEBEB. Air is an active hierarchy tool: it isolates small meaningful objects.",
    },
    {
      head: "Specimen colour.",
      body: "Blue recurs in Nodes, catalogue, diagrams, modular and Office; green recurs in tubes, diagrams and the sneaker campaign. Neither establishes a universal control accent. Colour differentiates artwork and specimens.",
    },
  ],
  rules: [
    "Separate groups with whitespace and precise ink rules.",
    "Keep controls neutral; colour lives inside photographs and diagrams.",
    "Use one large editorial statement beside small structured labels.",
    "Keep reading text readable; miniature reference captions are not a UI size specification.",
    "Use outlined pressable controls, with solid ink identifying the selected segment.",
  ],
  seed: {
    accent: "#1C1C1C",
    chassis: "#F3F3F3",
    paper: "#1C1C1C",
    render: "drawn",
    radius: 0.1,
    pills: true,
    density: "default",
    fontSans: '"Arial", sans-serif',
    fontMachine: '"Arial Narrow", "Arial", sans-serif',
    fontMono: '"Courier New", monospace',
    fontLcd: '"Courier New", monospace',
  },
} as const;

export const PIGMENT = {
  name: "pigment-window",
  title: "Pigment Window",
  essence: "Contained fields of blurred foliage and pooled pigment, framed by quiet paper and crisp neutral type.",
  role: "A separate atmospheric companion",
  fingerprint: "W4 V3 D2 F3 E3 C3 O3",
  seed: {
    accent: "#1C1C1C",
    chassis: "#F6F5F1",
    paper: "#1C1C1C",
    render: "drawn",
    radius: 0.15,
    pills: true,
    density: "comfortable",
    fontSans: '"Arial", sans-serif',
    fontMachine: '"Arial Narrow", "Arial", sans-serif',
    fontMono: '"Courier New", monospace',
    fontLcd: '"Courier New", monospace',
  },
} as const;

/* --- 2 · Pick the one that fits ---------------------------------------------- */

export const FIT = {
  prompt: "Which style fits a budgeting app for students? Compare the one we just made with Echo's.",
  working:
    "I’m using Echo’s style-fit skill to compare our two styles with Echo’s own library, focusing on clear daily budgeting and a tone that feels approachable to students.",
  /** The product's profile and tolerance, as the run passed them to fit_styles. */
  profile: "W3 V2 D3 F3 E3 C4 O2",
  tolerance: "W1 V1 D1 F1 E2 C1 O1",
  /** fit_styles' answer. */
  ranking: [
    "1. `drafting-index` (Echo's): W2 V2 D3 F4 E2 C4 O2, inside every tolerance",
    "2. `ink-instrument` (yours): W2 V2 D3 F4 E3 C5 O2, inside every tolerance",
    "3. `echo` (Echo's): W4 V3 D3 F2 E3 C5 O3, inside every tolerance",
    "4. `pigment-window` (yours): W4 V3 D2 F3 E3 C3 O3, inside every tolerance",
  ],
  orders: "It orders; it doesn't decide.",
  pick: "I’d choose Ink Instrument for the app",
  pickRest:
    ", with friendlier language and the available budget as its main visual focus. It preserves your neutral, drawn direction while giving amounts and transactions a clear hierarchy.",
  differs:
    "My pick differs because your established visual preferences and room for a warmer voice matter beyond the numerical ranking.",
  table: [
    { style: "Ink Instrument — ours", fit: "Calm, precise and flexible enough to feel approachable", drawback: "Can become clinical" },
    { style: "Drafting Index — Echo’s", fit: "Strongest ready-made ledger system, with clear selection and action rules", drawback: "Its spec-sheet voice can feel bureaucratic" },
    { style: "Original Echo", fit: "Tactile controls make everyday interaction inviting", drawback: "Dark surfaces, glow and molded controls depart from your chosen direction" },
    { style: "Pigment Window — ours", fit: "Good for welcome screens and savings-goal imagery", drawback: "Too atmospheric for the working dashboard" },
  ],
  adapt: [
    "Make “Available this week” the largest, clearly labelled amount.",
    "Replace technical annotations with familiar labels such as “Food” and “Add expense.”",
    "Put budget categories and readable transaction rows ahead of decorative imagery.",
  ],
  risk: "The biggest risk is making money management feel like operating laboratory equipment. Keep the precision; use calm, plain language.",
  /** The decision the reply linked, by the name the run wrote. */
  files: [{ name: "student-budgeting-direction-2026-10-14.md", title: "Student budgeting direction", kind: "doc" }],
} as const;

/** The fingerprints fit_styles ranked, for the live ranking (the same arithmetic, in the page). */
export const CANDIDATES = [
  { name: "drafting-index", title: "Drafting Index", from: "echo", fingerprint: "W2 V2 D3 F4 E2 C4 O2" },
  { name: "ink-instrument", title: "Ink Instrument", from: "yours", fingerprint: INK.fingerprint },
  { name: "echo", title: "Echo", from: "echo", fingerprint: "W4 V3 D3 F2 E3 C5 O3" },
  { name: "pigment-window", title: "Pigment Window", from: "yours", fingerprint: PIGMENT.fingerprint },
] as const;

/* --- 3 · Feel it ------------------------------------------------------------- */

export const WEAR = {
  /** The run's reply, closing its pick: the link it gave (the host from REGISTRY_HOMEPAGE, as every file's is). */
  link: `${REGISTRY_HOMEPAGE}/generator?accent=1c1c1c&chassis=f3f3f3&paper=1c1c1c`,
  label: "Preview Ink Instrument’s colours on Echo",
  note: "the preview link carries colours only.",
  /** wear_style's answer. */
  tool: "Only the colours travel in a link: the radius, density and finish show once a project wears the style.",
  init: "npx echo-ui-cli init --style ink-instrument",
} as const;

/* --- 4 · Build with it --------------------------------------------------------- */

export const BUILD = {
  /** As typed, with the plugin's mention shown as its name. */
  prompt: "build a screen with @Echo UI using this style",
  working:
    "I’ll build a student budgeting overview in Ink Instrument, with the available budget, category spending, and recent transactions arranged for a phone first.",
  checked: "The first version builds successfully and passes Echo’s source check.",
  done: "Built Pocket with real Echo UI components in Ink Instrument.",
  doneRest: "It includes working expense entry, editable budgets, week/month views, search, and browser saving. Desktop and phone checks passed.",
  /** Its progress as it went, each the first sentence of one of the run's messages, word for word. */
  steps: [
    "Echo is now installed with the actual Ink Instrument theme.",
    "The first version builds successfully and passes Echo’s source check.",
    "Echo’s desktop and phone checks both passed.",
  ],
  /** The files the reply linked (`name`, as the run wrote it), shown as documents. */
  files: [
    { name: "student-budget-source.zip", title: "Student budget source", kind: "zip" },
    { name: "student-budget-desktop.png", title: "Student budget, desktop", kind: "image" },
  ],
} as const;

/* --- In a chat: a question the run asked after the build ---------------------------- */

/** The run's last exchange: a plain question about a component, and the first sentence of its answer. */
export const ASK = {
  prompt: "Which @Echo UI Echo UI component should I use for a settings toggle?",
  answer: "for an on/off setting that changes immediately, such as notifications or sound.",
  /** The component it named, in the reply's own words: "Use **`Switch` (`echo-switch`)** …". */
  component: "Switch",
  item: "echo-switch",
} as const;

/* --- 5 · On-brand and WCAG 2.2 AA, checked ------------------------------------- */

/** Echo's check on the slip line (check_code, run on it against the registry's catalog), as it answered. */
export const CHECK = {
  file: "src/App.tsx",
  slip: "export function SaveBar() {\n  return <button style={{ background: '#2563eb' }}>Save</button>;\n}",
  fixed: 'import { HardwareButton } from "@/components/echo/hardware-button";\n\nexport function SaveBar() {\n  return <HardwareButton variant="primary">Save</HardwareButton>;\n}',
  head: "2 problems, each with the Echo way to fix it:",
  findings: [
    "src/App.tsx:2:39 (colour) `#2563eb` is a colour written by hand: use a role from your theme; the nearest is `var(--echo-primary-cap-top)`.",
    "src/App.tsx:2:10 (lookalike) <button> where Echo has HardwareButton: use HardwareButton (`npx echo-ui-cli add hardware-button`, then `npx echo-ui-cli docs hardware-button`).",
  ],
  clean: "No problems: nothing here goes against Echo's rules.",
} as const;
