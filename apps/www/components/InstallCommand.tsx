"use client";

/**
 * The install line: a package-manager switcher over one copyable command
 *, lifted out of ComponentDoc so the homepage shows the same
 * control rather than a second, drifting copy of it.
 *
 * The tabs are labelled by the *runner* (`npx`, not `npm`) on purpose. Echo is
 * a registry, not an npm package — nothing here is `npm install`-ed, and the
 * only thing coming from npm is the `echo-ui-cli` binary itself. Labelling the
 * first tab "npm" on a site whose pitch is "not an npm package" reads as a
 * contradiction. npx stays first and is the default.
 */
import { useState } from "react";
import { ECHO_CLI, installCommand } from "@registry/agent/guidance";
import { coreInstallCommand, isCoreModule } from "@registry/agent/core-modules";
import { useCopy } from "@/components/use-copy";
import { PreRelease } from "@/components/PreRelease";

/**
 * Built from `installCommand`, not spelled out. The CLI's name appears on 53
 * doc pages and three template pages through this component, so hardcoding it
 * here would make a rename a hunt rather than one edit — see `identity.test.ts`.
 */
const MANAGERS = [
  {
    id: "npx",
    core: "npm",
    run: (item: string) => installCommand(item, `npx ${ECHO_CLI}`),
  },
  {
    id: "pnpm",
    core: "pnpm",
    run: (item: string) => installCommand(item, `pnpm dlx ${ECHO_CLI}`),
  },
  {
    id: "yarn",
    core: "yarn",
    run: (item: string) => installCommand(item, `yarn dlx ${ECHO_CLI}`),
  },
  {
    id: "bun",
    core: "bun",
    run: (item: string) => installCommand(item, `bunx ${ECHO_CLI}`),
  },
] as const;

export function InstallCommand({
  item,
  size = "md",
  /**
   * Whether to carry the "not released yet" banner. On by default, because
   * the guarantee worth having is that a command cannot appear without one.
   * The installation guide is the single page that banners itself — it opens
   * with `init` as a plain code block, above the first InstallCommand — and
   * two identical notices on one page read as a mistake.
   */
  notice = true,
}: {
  item: string;
  size?: "md" | "lg";
  notice?: boolean;
}) {
  const [manager, setManager] =
    useState<(typeof MANAGERS)[number]["id"]>("npx");
  const { copied, copy: copyText } = useCopy();
  const core = isCoreModule(item);
  const chosen = MANAGERS.find((m) => m.id === manager)!;
  // Core modules are an npm package, not a registry item: a plain install, and
  // the first tab reads "npm" because that's the command it shows.
  const command = core ? coreInstallCommand(chosen.core) : chosen.run(item);
  const big = size === "lg";
  const copy = () => copyText(command);

  return (
    <>
      {/*
       * Attached to the command rather than to the page, so the 53 component
       * pages, the templates and the homepage hero cannot show a line that
       * does not run yet without saying so.
       */}
      {notice && <PreRelease />}
      <div
        className="echo-install"
        style={{
          border: "1px solid var(--echo-seam)",
          borderRadius: 12,
          background: "var(--echo-lcd)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "6px 6px 6px 8px",
            borderBottom: "1px solid var(--echo-seam)",
            background: "var(--echo-surface)",
          }}
        >
          {MANAGERS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setManager(m.id)}
              aria-pressed={m.id === manager}
              style={{
                padding: "4px 9px",
                // The selected manager reads in --echo-text with an accent
                // underline rather than accent-on-tint: accent text over its own
                // 15% wash lands at 3.19:1, under AA.
                borderWidth: "0 0 2px",
                borderStyle: "solid",
                borderColor:
                  m.id === manager ? "var(--echo-accent)" : "transparent",
                borderRadius: "7px 7px 2px 2px",
                cursor: "pointer",
                fontFamily: "var(--echo-font-mono)",
                fontSize: 11.5,
                letterSpacing: "0.06em",
                background:
                  m.id === manager
                    ? "color-mix(in srgb, var(--echo-cap) 55%, transparent)"
                    : "transparent",
                color:
                  m.id === manager
                    ? "var(--echo-text)"
                    : "var(--echo-text-dim)",
              }}
            >
              {core ? m.core : m.id}
            </button>
          ))}
          <button
            type="button"
            onClick={copy}
            style={{
              marginLeft: "auto",
              padding: "4px 10px",
              borderRadius: 7,
              border:
                "1px solid color-mix(in srgb, var(--echo-cap) 60%, transparent)",
              background: "var(--echo-cap)",
              color: "var(--echo-text)",
              fontFamily: "var(--echo-font-mono)",
              fontSize: 11.5,
              cursor: "pointer",
            }}
          >
            {copied ? "copied" : "copy"}
          </button>
          <span role="status" aria-live="polite" style={srOnly}>
            {copied ? "Install command copied to clipboard" : ""}
          </span>
        </div>
        <pre
          style={{
            margin: 0,
            padding: big ? "16px 18px" : 14,
            background: "transparent",
            color: "var(--echo-text)",
            fontSize: big ? 14.5 : 13,
            overflowX: "auto",
          }}
          tabIndex={0}
        >
          {command}
        </pre>
      </div>
    </>
  );
}

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};
