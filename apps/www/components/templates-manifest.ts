/**
 * The templates manifest. One list drives the /templates routes,
 * the docs sidebar group and the homepage strip — the same discipline the
 * component manifest enforces, so a block cannot exist in one place and be
 * missing from another.
 *
 * `proves` is the one-paragraph note required beside each screen. It is
 * not marketing: a template that does not answer a question the component
 * pages already answer has no reason to exist.
 */
import { meta as consoleMeta } from "@registry/echo/console/meta";
import { meta as chatMeta } from "@registry/echo/chat/meta";

export interface TemplateItem {
  slug: string;
  name: string;
  title: string;
  description: string;
  proves: string;
  /**
   * One line for the index rows (home + /templates). `proves` is the full
   * note and stays on the template's own page; the index used to print all of
   * it in a grey card each, which made the list a wall of paragraphs.
   */
  tagline: string;
  /**
   * The screen sizes itself to the viewport (a full app frame), so the stage
   * gives it a viewport-shaped box instead of letting it push the docs page
   * open to 100dvh of mostly nothing.
   */
  fullBleed?: boolean;
}

export const TEMPLATES: readonly TemplateItem[] = [
  {
    slug: "console",
    name: consoleMeta.name,
    title: "Console",
    description: consoleMeta.description,
    tagline: "A rail, six readouts, a level matrix and a table on one viewport.",
    proves:
      "Density and data at scale. Every other screen shows a few components with room around them; this one puts a rail, a sidebar, six readouts, a level matrix, status lights and a table on one viewport and asks whether the material language still holds when nothing has room.",
    fullBleed: true,
  },
  {
    slug: "chat",
    name: chatMeta.name,
    title: "Chat",
    description: chatMeta.description,
    tagline: "One conversation — running text, one well to type into, one lit cap to send.",
    proves:
      "Whether the material language survives running text. Console is mostly controls; this one is mostly words, which is where a tactile library usually gives up and boxes every message in a card. It commits to the opposite: incoming messages get no container, what you sent sits in the composer's recessed well, and the only raised, lit object is Send.",
  },
];

export const TEMPLATE_SLUGS: readonly string[] = TEMPLATES.map((t) => t.slug);

export function getTemplate(slug: string): TemplateItem | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

/**
 * Templates on their way: named on /templates so people know they're
 * coming, with nothing behind them yet — no route, no block, no code.
 */
export const COMING_SOON: readonly string[] = ["Auth", "Marketing", "Settings", "Mobile app"];
