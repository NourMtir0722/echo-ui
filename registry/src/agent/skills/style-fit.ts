/**
 * Echo's Style Fit: the skill that picks the style a product wears, from the
 * builder's own library and Echo's. It is Noor Mtir's Style Fit (profile the
 * product before looking at a candidate, score against it, argue against the
 * winner, a decision document someone could disagree with), with what Echo
 * needed on top: the brief the project keeps, candidates from both
 * libraries, the ordering done by the CLI's arithmetic so every agent gets
 * the same shortlist, and the pick worn with `style use`, its amendments kept
 * in the project where every agent reads them.
 */
import { DESIGN_PATH, STYLE_LIBRARY, runCommand } from "../guidance";
import { askTheBuilder } from "./ask";
import { anchorsMarkdown } from "./axes";

export const STYLE_FIT_NAME = "echo-style-fit";
export const STYLE_FIT_PATH = `.claude/skills/${STYLE_FIT_NAME}/SKILL.md`;

const LIBRARY = STYLE_LIBRARY;

/**
 * Where a builder meets Style Fit outside a project: in a chat, through
 * Echo's plugin, with no terminal and no library on disk. The rest of the
 * skill is written for a project; this says what each step becomes there.
 */
function inAChat(cmd: (c: string) => string): string[] {
  return [
    "## Where you are",
    "",
    "This skill runs in a project, with a terminal, and in a chat, without one.",
    "",
    "- **In a project** (any agent that can run commands in the builder's code): everything below applies as written.",
    "- **In a chat** (with Echo's connector, and no terminal): the commands below can't run, and the builder's library isn't on disk. Do the same work this way:",
    "",
    "| Below, in a project | In a chat |",
    "| --- | --- |",
    `| ${cmd("style list --json")}, ${cmd("style show <name>")} | \`list_styles\` for Echo's (with a name, one in full). The builder's own are the ones they share or point you to in this chat: their \`style.json\` files, or their library's \`INDEX.md\` (a fingerprint is enough to rank). If they haven't, ask for them once: in a chat the library can't be read, so this is the one time to ask. |`,
    "| The project's `## Product` section, its README and screens | The conversation; ask only what's still missing. |",
    `| ${cmd("style fit --profile … --tolerance …")} | \`fit_styles\`, the same arithmetic, with the builder's own passed in as \`yours\`: each one's name and fingerprint. |`,
    "| Save the decision in the library's `decisions/`, with its row | Hand the decision back as a file, `<product>-direction-<yyyy-mm-dd>.md`, to keep beside their styles. |",
    `| ${cmd("style use <name>")}, and the amendments into \`DESIGN.md\` | \`wear_style\` (\`name\` for Echo's, \`style\` for theirs): its link lets the builder feel the pick on Echo's own site. Put WHAT TO ADAPT and WHAT NOT TO TAKE in the decision file; in the code tool, they go into \`DESIGN.md\`'s \`## Product\` section. |`,
    "",
  ];
}

/**
 * The skill. `anywhere` is the plugin's copy, which also runs in a chat; the
 * one `init` writes into a project leaves that section out.
 */
export function styleFitSkill({ anywhere = false }: { anywhere?: boolean } = {}): string {
  const cmd = (c: string) => `\`${runCommand(c)}\``;
  return [
    "---",
    `name: ${STYLE_FIT_NAME}`,
    `description: Pick the visual style ${anywhere ? "a product" : "this product"} wears with Echo UI, from the builder's own style library (${LIBRARY}) and Echo's. Profiles the product on the seven temperament axes the styles are placed on, ${anywhere ? "has Echo order" : "has the CLI order"} every candidate against that profile, reads the best of them, and returns an opinionated pick with the argument for it, the runner-up, what to adapt and what to refuse; then wears it. Use when the builder asks which style fits, how the product should look, to pick a design direction, or whether a style suits the product.`,
    "---",
    "",
    "# Style Fit, for Echo",
    "",
    "Choose the style this product wears, and make the choice arguable. The deliverable is a decision someone could disagree with, not a ranking and not a summary of the options. Echo's grammar stays whatever you pick (the light, what each material is for, state in words, motion as physics, AA); a style changes the vocabulary: colours, type, radius, finish, density, and the rules the agent builds screens by.",
    "",
    "**Candidates come from the libraries, not from the builder.** The builder's own styles are in their library, written there by Echo's Design Eye; Echo's are published with the registry. Never ask for documents to be uploaded or pasted.",
    "",
    `- ${cmd("style list --json")} lists every style from both, with its essence, whether it makes a light or a dark device, and where its foundation is.`,
    `- ${cmd("style show <name>")} shows one: its fingerprint, settings, rules, refusals, fonts, and the path of its foundation document.`,
    `- The library's \`INDEX.md\` has each of the builder's styles with its fingerprint and what it serves.`,
    "",
    "Consider every style unless the builder names some. A style read months ago is still a candidate; the point of a library is that it accumulates.",
    "",
    ...(anywhere ? inAChat(cmd) : []),
    "## The mechanism",
    "",
    "The reason this isn't taste: **profile the product on the same axes before looking at any candidate.** Score the product first, then measure distance. The other order, reading the styles and then rationalizing a favourite, produces confident nonsense, and you'll feel the pull, because one option is usually prettier.",
    "",
    "1. Build the product's profile.",
    "2. Order the candidates against it, and read the best of them.",
    "3. Argue against the winner.",
    "4. Write the decision, and wear the style.",
    "",
    "## Step 1: the brief, then the profile",
    "",
    `Read what the project already says about itself: a \`## Product\` section in \`${DESIGN_PATH}\` (Echo's Design Eye writes one there), the README, the \`package.json\` description, the landing copy, the screens already built. You need: who it's for and their age range; what they come to do; where they use it (a phone, a desk, both); what it competes against; what it must never feel like. Ask the builder only what's missing and would change the answer, in one message of at most three short questions. Write the answers into the \`## Product\` section, above Echo's marked block (Echo keeps anything outside its markers).`,
    "",
    "**An earlier decision for the same product** (in the library's `decisions/`, and its Decisions table) is evidence, not a rule. Read it: it may know things the brief doesn't (what the screens carry, what the product claims). But a product and its direction change, and a constraint written for another style can quietly shape this one (\"the chrome must be darker than the artwork\" was a dark style's answer to a need a light style meets another way). So carry each of its constraints as a question, never straight into HARD CONSTRAINTS: say what it was protecting, ask whether it still holds, and suggest the answer. When it does, write it as the need (\"the sheet must stand off its surround\"), not as the one style's fix for it (\"a darker frame\"). Name a new decision for the same product with its date (`<product>-direction-<yyyy-mm-dd>.md`), and say in it what it changes from the earlier one.",
    "",
    "Then place the product on the seven axes, as a **target with a tolerance**: the position it wants, and how far a style may drift from it. Some axes are locked (a medical records tool can't be playful: tolerance 0); others are open (era is often free: tolerance 2). A style that misses a locked axis is out; one that misses an open axis by two costs nothing. Place it with the same anchors Design Eye places a style with:",
    "",
    anchorsMarkdown(),
    "",
    "```",
    "| AXIS | 1 ←→ 5 | TARGET | TOLERANCE | WHY |",
    "| Warmth      | clinical ←→ human      | n | n | ... |",
    "| Volume      | whisper ←→ shout       | n | n | ... |",
    "| Density     | sparse ←→ dense        | n | n | ... |",
    "| Formality   | playful ←→ severe      | n | n | ... |",
    "| Era         | heritage ←→ futuristic | n | n | ... |",
    "| Craft       | raw ←→ engineered      | n | n | ... |",
    "| Ornament    | austere ←→ decorative  | n | n | ... |",
    "```",
    "",
    "Then three things the axes can't hold:",
    "",
    "- **MUST SIGNAL**: what a stranger has to feel in two seconds, or the product has failed.",
    "- **MUST NEVER SIGNAL**: the read that would be fatal. Usually the sharpest instrument in the document.",
    "- **HARD CONSTRAINTS**: what the screens must carry (dense tables, user photography, long text, many languages), and what the team can really build and keep up. Each one is a need, said so any style can meet it, never one style's way of meeting it.",
    "",
    "## Step 2: order the candidates, then read them",
    "",
    `${cmd('style fit --profile "W4 V2 D1 F2 E3 C3 O3" --tolerance "W1 V1 D1 F0 E2 C1 O1"')} measures every style against the profile: each axis's distance, how far past its tolerance the style lands, and which locked axes it misses. It orders them; it doesn't decide. Take the first three to five that miss no locked axis, and read each one's foundation in full (${cmd("style show <name>")} gives the path): its PART III fit profile, its rules and its refusals.`,
    "",
    "For each, check what the axes don't cover:",
    "",
    "- **SERVES**: is this product in the territory the style is built for, or next to it?",
    "- **STRAINS**: does the product's content live exactly where the style breaks? A style that can't carry dense data is out for a data product, however well it scores.",
    "- **COSTS**: can this team build it and keep it up? A style that needs a house illustration process is a hiring decision, not a design decision.",
    "- **MUST NEVER SIGNAL**: does the style trip the fatal read? That's a veto, not a deduction.",
    "- **The device**: a pale style makes Echo's light device (light plastic, screens of paper glass), a dark one the dark device (lit screens). Say which the product gets, and why it suits where it's used.",
    "- **The slop police**: the list marks a style whose own ingredients make a pairing the police bans (a cream ground with a terracotta accent, indigo on white in a stock sans…). It stays on the list, and it can still win, but only if the builder keeps what the police bans. If it's your pick, ask them before you wear it.",
    "- **Its decisions**: how many of the style's decisions it makes (`style show` lists them). A style that decides little leaves every screen to ask; say so when it's close.",
    "",
    "State the order the CLI gave, then say plainly which factor drove the call: usually one or two things, not the sum.",
    "",
    "## Step 3: argue against the winner",
    "",
    "Before writing, argue against your own pick. Where does it fail this product? What breaks first? What will the team be tempted to add that would ruin it? Put what you find in the document: the risks are what the builder returns to in three months.",
    "",
    "- **The hybrid trap.** The surface of one style on the structure of another usually reads as neither. When the two foundations list each other under ADJACENT, a blend is available; when they don't, say so and make the builder choose.",
    "- **The prettiest-option pull.** The most beautiful foundation is often the worst fit. If the losing candidate is the better artefact, say it out loud.",
    "",
    "## Step 4: the decision, then wear it",
    "",
    "```",
    "# <Product> × <Style>: direction",
    "",
    "THE CALL: the pick and the one-sentence reason, first line.",
    "THE PRODUCT: the axis table, must signal, must never signal, hard constraints.",
    "THE ORDER: what style fit gave, then one short reading per candidate you read:",
    "  distances, vetoes, the verdict in a sentence. Losing candidates get a real reading.",
    "WHY THIS ONE: the argument, citing the foundation's own rules by name.",
    "WHAT TO ADAPT: amendments to the style's rules for this product: which rule, what it",
    "  becomes, why. Few; a style that needs five amendments is the wrong style.",
    "WHAT NOT TO TAKE: the parts that don't survive this product, and what to do instead.",
    "THE RISKS: what breaks first, what the team will be tempted to add, the early warning.",
    "THE RUNNER-UP: what it was better at, and the condition that flips the call.",
    "```",
    "",
    "Write it as a designer arguing a position to a founder who'll push back: declarative, specific, no hedging. Cite the evidence: sampled colours, named materials, the foundation's constraints.",
    "",
    `1. Save it to the builder's library, \`${LIBRARY}/decisions/<product>-direction.md\` (or \`$ECHO_STYLES_DIR/decisions/\`; ${cmd("style list")} prints the library's path), and add a row to the Decisions table in its \`INDEX.md\`: product, pick, date, link. Start the table if there isn't one.`,
    `2. Wear it: ${cmd("style use <name>")} writes its settings to the project and its rules and decisions to \`${DESIGN_PATH}\`. Do it when the builder asked you to choose, or says yes to the pick. It refuses a style the slop police stops: ask the builder (below), and if they keep it, add their reason to the style's \`keeps\` in the library; if not, pick the runner-up. A pick that's only its document (${cmd("style fit")} and ${cmd("style show")} say so) needs its Echo part first: write it the way Echo's Design Eye does ("A foundation without its Echo part", in its skill), then wear it.`,
    `3. Put WHAT TO ADAPT and WHAT NOT TO TAKE into the \`## Product\` section of \`${DESIGN_PATH}\`, under "Style amendments", so every agent building a screen keeps to them, including any decision this product changes ("the main action: the blue cap, and never on a photo"). The style stays as it is in the library: it's reused across products, and the amendments are this product's.`,
    "4. In chat: the call, the one-sentence reason, and the single biggest risk. Point to the decision document for the rest.",
    "",
    askTheBuilder(),
    "",
    "## When nothing fits",
    "",
    `Say so. Candidates that all miss a locked axis mean the libraries were collected for other products: a useful finding, and the builder needs it more than a forced winner. Describe the style the profile is asking for, precisely enough to go and collect references for it, then read them with Echo's Design Eye. Until then, the product can wear Echo's own style (${cmd("style use echo")}) or keep its seed.`,
    "",
  ].join("\n");
}
