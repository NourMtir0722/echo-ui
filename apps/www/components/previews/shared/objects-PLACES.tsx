"use client";

import { glyph } from "./objects-glyph";

export const PLACES = [
  { value: "open", label: "Open now", icon: glyph("M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2") },
  { value: "rated", label: "Top rated", icon: glyph("M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z") },
  { value: "near", label: "Nearby", icon: glyph("M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11zM12 12.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z") },
  { value: "deals", label: "Deals", icon: glyph("M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5zM8 9.9a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z") },
];
