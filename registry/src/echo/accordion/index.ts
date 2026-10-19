/**
 * The entry point for Accordion, deliberately NOT a client module: the parts are
 * attached here, from named client exports. Attached inside the "use client"
 * file, they didn't survive a server component's import, so Accordion.Item was
 * undefined in a Next.js page or layout and the build failed.
 */
import { AccordionRoot, AccordionItem, AccordionTrigger, AccordionPanel } from "./accordion";

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Panel: AccordionPanel,
});
