/**
 * What the journey quotes: one recorded run of Echo's plugin in Codex, on one
 * board, word for word.
 *
 * The run's own board held other people's work (campaigns, product shots), so
 * the page shows a board of the same two looks instead, its images made for
 * this page, so it shows nobody else's work. The replies were written about
 * the run's own board.
 *
 * Nothing here is written to look like a reply. Every string is the reply, or
 * the tool's output, as it came, and it's only ever trimmed: where it says
 * "…", and where the run weighed a style Echo no longer publishes, which is
 * left out, with what it said about it. The two style files are the run's own
 * `style.json`, cut to what the page shows; Ink Instrument's settings are the
 * ones Echo publishes under its name, so the page wears what a project gets.
 */
import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";
import { PUBLISHED_STYLES } from "@registry/agent/published-styles";

/** Where the run happened, said in plain text: no other product's interface or logo. */
export const WHERE = "In Codex, with Echo's plugin";

/**
 * The board: a stand-in for the run's, in its two looks (see above), ten
 * technical sheets and interface parts and six of soft colour. `group`: the
 * run's style each tile belongs to. The order is where each lies on the desk
 * (MakeCard.tsx `DESK`), the two looks mixed; the first eight are the prompt's
 * thumbnails.
 */
export const BOARD: readonly { src: string; alt: string; group: "ink" | "pigment"; w: number; h: number }[] = [
  { src: "green-bokeh", alt: "Sunlit leaves out of focus, in lime and deep green", group: "pigment", w: 640, h: 480 },
  { src: "mixer", alt: "An equaliser panel: a curve over a grid, and nine sliders", group: "ink", w: 640, h: 480 },
  { src: "blue-spec", alt: "A spec sheet: a parts list on blue beside an exploded drawing of a small module", group: "ink", w: 640, h: 640 },
  { src: "desk-instrument", alt: "A small charcoal instrument with a metal dial, a blue button and a green one", group: "ink", w: 640, h: 480 },
  { src: "sky-leaves", alt: "Blue sky through a ring of blurred green leaves", group: "pigment", w: 640, h: 429 },
  { src: "iso-stack", alt: "An isometric drawing of three stacked slabs, the middle one blue", group: "ink", w: 640, h: 478 },
  { src: "glass-tubes", alt: "Green glass tubes bent into loops and coils", group: "ink", w: 640, h: 478 },
  { src: "switch", alt: "A two-part switch, Live selected in black, Draft in white", group: "ink", w: 640, h: 512 },
  { src: "pigment-drops", alt: "Twelve drops of watercolour on paper, in greens, blues, violet and one orange", group: "pigment", w: 640, h: 480 },
  { src: "lime-sheet", alt: "A lime spec sheet with line drawings of stacking drawer blocks", group: "ink", w: 640, h: 480 },
  { src: "layer-chip", alt: "A small outlined tag reading Layers, a blue count of 12 beside it, and a pointer", group: "ink", w: 640, h: 480 },
  { src: "watercolour-edge", alt: "The torn edge of paper soaked in blue, lime and violet watercolour", group: "pigment", w: 640, h: 480 },
  { src: "raised-button", alt: "A raised pill button, black on white, reading Start a style", group: "ink", w: 640, h: 427 },
  { src: "green-horizon", alt: "A soft gradient from deep green through lime to pale mint", group: "pigment", w: 640, h: 480 },
  { src: "card-drawer", alt: "A pen drawing of an open card-index drawer, its parts labelled", group: "ink", w: 640, h: 640 },
  { src: "blurred-poster", alt: "A poster of blurred green foliage titled Late Spring", group: "pigment", w: 482, h: 640 },
];

export const boardSrc = (name: string) => `/journey-board/${name}.jpg`;

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
  seed: PUBLISHED_STYLES.find((s) => s.name === "ink-instrument")!.seed,
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
    "1. `ink-instrument` (yours): W2 V2 D3 F4 E3 C5 O2, inside every tolerance",
    "2. `echo` (Echo's): W4 V3 D3 F2 E3 C5 O3, inside every tolerance",
    "3. `pigment-window` (yours): W4 V3 D2 F3 E3 C3 O3, inside every tolerance",
  ],
  orders: "It orders; it doesn't decide.",
  pick: "I’d choose Ink Instrument for the app",
  pickRest:
    ", with friendlier language and the available budget as its main visual focus. It preserves your neutral, drawn direction while giving amounts and transactions a clear hierarchy.",
  table: [
    { style: "Ink Instrument — ours", fit: "Calm, precise and flexible enough to feel approachable", drawback: "Can become clinical" },
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
