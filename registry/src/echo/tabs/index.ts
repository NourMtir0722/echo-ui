/**
 * The entry point for Tabs, deliberately NOT a client module: the parts are
 * attached here, from named client exports. Attached inside the "use client"
 * file, they didn't survive a server component's import, so Tabs.List was
 * undefined in a Next.js page or layout and the build failed.
 */
import { TabsRoot, TabsList, TabsTab, TabsPanel } from "./tabs";

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});
