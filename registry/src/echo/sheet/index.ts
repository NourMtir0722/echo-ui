/**
 * The entry point for Sheet, deliberately NOT a client module: the parts are
 * attached here, from named client exports. Attached inside the "use client"
 * file, they didn't survive a server component's import, so Sheet.Trigger was
 * undefined in a Next.js page or layout and the build failed.
 */
import { SheetRoot, SheetTrigger, SheetContent, SheetClose } from "./sheet";

export const Sheet = Object.assign(SheetRoot, {
  Trigger: SheetTrigger,
  Content: SheetContent,
  Close: SheetClose,
});
export type { SheetProps, SheetContentProps, SheetSide } from "./sheet";
