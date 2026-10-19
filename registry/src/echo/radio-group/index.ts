/**
 * The entry point for RadioGroup, deliberately NOT a client module: the parts are
 * attached here, from named client exports. Attached inside the "use client"
 * file, they didn't survive a server component's import, so RadioGroup.Item was
 * undefined in a Next.js page or layout and the build failed.
 */
import { RadioGroupRoot, RadioGroupItem } from "./radio-group";

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem,
});
export type { RadioGroupProps, RadioGroupOrientation } from "./radio-group";
