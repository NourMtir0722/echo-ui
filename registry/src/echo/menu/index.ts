/**
 * The entry point for Menu and ContextMenu, deliberately NOT a client module:
 * the parts are attached here, from named client exports. Attached inside the
 * "use client" file, they didn't survive a server component's import, so
 * Menu.Trigger was undefined in a Next.js page or layout and the build failed.
 */
import {
  ContextMenuContent,
  ContextMenuRoot,
  ContextMenuTrigger,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuRoot,
  MenuSeparator,
  MenuSubmenuRoot,
  MenuSubmenuTrigger,
  MenuTrigger,
} from "./menu";

/** Everything but Root, Trigger and Content is shared by both menus. */
const shared = {
  Item: MenuItem,
  LinkItem: MenuLinkItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
  GroupLabel: MenuGroupLabel,
  CheckboxItem: MenuCheckboxItem,
  RadioGroup: MenuRadioGroup,
  RadioItem: MenuRadioItem,
  Submenu: MenuSubmenuRoot,
  SubmenuTrigger: MenuSubmenuTrigger,
};

export const Menu = Object.assign(MenuRoot, { Trigger: MenuTrigger, Content: MenuContent, ...shared });

/**
 * The right-click menu. Same panel, same items; only the summoning differs.
 * `ContextMenu.Trigger` is the REGION you right-click, not a button.
 */
export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  ...shared,
});
export type { MenuContentProps } from "./menu";
