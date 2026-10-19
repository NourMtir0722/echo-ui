import type { ReactNode } from "react";
import { AppShell } from "@registry/echo/app-shell";

/**
 * A test fixture, not a page anyone visits: AppShell used straight from a
 * server layout, the way an app's layout.tsx uses it. It failed to build
 * before and hydrated with mismatched ids;
 * tests/app-shell.spec.ts checks both.
 */
export default function ServerShellLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <AppShell.Rail label="Fixture" brand={<strong>Echo</strong>}>
        <a href="/docs">Docs</a>
      </AppShell.Rail>
      <AppShell.Sidebar label="Fixture nav">
        <a href="/docs" aria-current="page">
          Overview
        </a>
      </AppShell.Sidebar>
      <AppShell.Content>{children}</AppShell.Content>
    </AppShell>
  );
}
