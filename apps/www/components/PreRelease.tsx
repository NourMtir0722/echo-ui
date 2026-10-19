/**
 * The banner that says Echo has not shipped, sitting on every surface that
 * shows an install command.
 *
 * The site advertises `npx echo-ui-cli`, and that name on npm is a reserved
 * stub with no `bin` — so the command resolves, installs nothing usable, and
 * fails with npx's own error about a missing executable. A reader following
 * the docs today cannot tell that from a mistake they made. This says which
 * it is.
 *
 * It renders from `CLI_RELEASED` in the registry's guidance module rather than
 * from a prop, because the fact is one fact: the same switch silences the
 * agent brief, and `release-state.test.ts` refuses to let one move without the
 * other. Nothing here is conditional on a page — the notice is attached to the
 * command, so a surface cannot show the command and miss the caveat.
 *
 * `role="note"` and not an `<aside>`: a complementary landmark per doc page is
 * one too many, and this is a remark inside a section, not a major
 * area of the page. The accent is a rule and a heading colour only; the body
 * stays `--echo-text`, because accent text on its own wash measures 3.19:1 and
 * AA is a floor here, not a target.
 */
import {
  CLI_RELEASED,
  PRERELEASE_HEADLINE,
  PRERELEASE_NOTICE,
} from "@registry/agent/guidance";
import { inline } from "@/components/inline-markdown";

export function PreRelease() {
  if (CLI_RELEASED) return null;
  return (
    <div
      role="note"
      aria-label={PRERELEASE_HEADLINE}
      style={{
        margin: "0 0 12px",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid var(--echo-seam)",
        borderLeft: "3px solid var(--echo-accent)",
        background: "var(--echo-well)",
      }}
    >
      <strong
        style={{
          display: "block",
          marginBottom: 4,
          font: "var(--echo-type-machine-label)",
          letterSpacing: "var(--echo-type-machine-label-tracking)",
          textTransform: "uppercase",
          color: "var(--echo-accent)",
        }}
      >
        {PRERELEASE_HEADLINE}
      </strong>
      <span
        style={{
          display: "block",
          color: "var(--echo-text)",
          fontSize: 13.5,
          lineHeight: 1.5,
        }}
      >
        {inline(PRERELEASE_NOTICE)}
      </span>
    </div>
  );
}
