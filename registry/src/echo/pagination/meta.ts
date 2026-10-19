import { z } from "zod";

export const paginationProps = z.object({
  page: z.number().describe("1-based current page."),
  count: z.number().describe("Total number of pages."),
  onPageChange: z.function().describe("Called with the requested page."),
  siblings: z.number().default(1).describe("Pages shown either side of the current one."),
  label: z.string().default("Pagination").describe("Name for the nav landmark."),
  previousLabel: z.string().default("Previous page").describe("The accessible name of the previous-page key. Default \"Previous page\"."),
  nextLabel: z.string().default("Next page").describe("The accessible name of the next-page key. Default \"Next page\"."),
});

export const meta = {
  name: "echo-pagination",
  title: "Pagination",
  description:
    "A row of molded number caps with the current page lit, inside a labelled nav. The window keeps the first and last page always reachable, never elides a single page behind a gap, and never changes width as you page through — a control that reflows under the cursor is how you misclick. The arithmetic is exported as paginationRange if you need it elsewhere.",
  props: paginationProps,
  examples: [
    {
      title: "Controlled",
      description: "The component owns no state; page is yours.",
      code: "<Pagination page={page} count={20} onPageChange={setPage} />",
    },
    {
      title: "Wider window",
      description: "More context either side of the current page.",
      code: "<Pagination page={page} count={120} siblings={2} onPageChange={setPage} />",
    },
    {
      title: "Named for its list",
      description: "Two paginations on one screen need distinguishable landmarks.",
      code: '<Pagination label="Takes pagination" page={page} count={9} onPageChange={setPage} />',
    },
  ],
  feel: "A row of small keys; the current page is the one pressed in.",
  usage: {
    imports: "import { Pagination } from \"@/echo/pagination\";",
    code: "<Pagination page={page} count={20} onPageChange={setPage} />",
  },
  composition: "Pagination",
  a11y: [
    "A `<nav>` named by `label`. Two paginations on one page need different labels.",
    "Each page button is named “Page 3”, not “3”; the current one carries `aria-current=\"page\"`.",
    "Previous and next are named “Previous page” and “Next page” (`previousLabel`, `nextLabel`) and are disabled at the ends. Gaps are `aria-hidden`.",
    "Keyboard: Tab moves through Previous, the pages and Next; Enter or Space goes to that page.",
  ],
  motion: {
    tokens: ["--echo-duration-pop"],
    reducedMotion: "The caps press without travelling, and the page you land on lights without the bloom.",
  },
  antiPatterns: [
    "Never render pagination for a list that fits on one page — count of 1 is a control that does nothing. Guard on count > 1 at the call site.",
    'Never label the page buttons with the bare number. They carry aria-label="Page 3" for a reason: a screen reader\'s element list full of "1 2 3" names nothing.',
    "Never make the ellipsis a control. It is aria-hidden here because announcing \"ellipsis\" between two numbers is noise, and a gap that expands on click is a different component.",
    "Never use it for infinite or unknown-length data. Pagination promises a last page; if you cannot name count, you want a load-more control instead.",
  ],
} as const;
