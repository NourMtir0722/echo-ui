/**
 * echo-ui-core/check in a production build: nothing.
 *
 * The package's `development` export condition points development builds at
 * `index.tsx`; everything else, a production build included, lands here. So
 * `<EchoCheck />` can stay in the root layout, and none of the page check's code
 * ships.
 */
import type { EchoCheckProps } from "./types";

export function EchoCheck(_props: EchoCheckProps): null {
  return null;
}

export { PAGE_RULES, PAGE_SCREEN_RULES } from "./types";
export type { PageFinding, PageCheckOptions, PageRule, EchoCheckProps } from "./types";
