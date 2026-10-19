/**
 * AppShell's entry point, deliberately NOT a client module: the parts are
 * attached here, from named client exports. Attached inside app-shell.tsx
 * ("use client"), they didn't survive a server component's import: in a
 * Next.js layout, AppShell.Rail was undefined and the build failed.
 */
import { AppShellContent, AppShellRail, AppShellRoot, AppShellSidebar } from "./app-shell";

export const AppShell = Object.assign(AppShellRoot, {
  Rail: AppShellRail,
  Sidebar: AppShellSidebar,
  Content: AppShellContent,
});
export type { AppShellProps, AppShellRailProps, AppShellSidebarProps } from "./app-shell";
