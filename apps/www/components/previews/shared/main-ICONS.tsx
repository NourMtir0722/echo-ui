"use client";

import { navIcon } from "./main-navIcon";

export const ICONS = {
  inbox: navIcon("M2 9h3.5l1 2h3l1-2H14M2 9l1.5-5h9L14 9v4H2z"),
  drafts: navIcon("M3 13h10M4 10l6.5-6.5 2 2L6 12H4z"),
  board: navIcon("M2.5 3h11v10h-11zM6 3v10M10 3v10"),
  docs: navIcon("M4 2h6l3 3v9H4zM10 2v3h3"),
  home: navIcon("M2.5 7.5 8 3l5.5 4.5V13h-11z"),
  search: navIcon("M7 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM10.5 10.5 14 14"),
  user: navIcon("M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14c.8-2.7 3-4 5.5-4s4.7 1.3 5.5 4"),
};
