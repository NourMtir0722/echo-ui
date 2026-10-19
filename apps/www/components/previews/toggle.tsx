"use client";

/** The live preview on /docs/toggle. */
import { Stack } from "@registry/echo/layout";
import { Toggle,ToggleGroup } from "@registry/echo/toggle";
import { glyph } from "./shared/main-glyph";
import { GlyphB } from "./shared/main-GlyphB";
import { GlyphI } from "./shared/main-GlyphI";

const GlyphU = glyph("M5 3v5a3 3 0 0 0 6 0V3M4 14h8");

export default function Preview() {
  return (
    <Stack direction="row" gap={8} align="center">
      <ToggleGroup aria-label="Text style" multiple defaultValue={["bold"]}>
        <Toggle value="bold" aria-label="Bold" icon={<GlyphB />} />
        <Toggle value="italic" aria-label="Italic" icon={<GlyphI />} />
        <Toggle value="underline" aria-label="Underline" icon={<GlyphU />} />
      </ToggleGroup>
      <ToggleGroup aria-label="View" defaultValue={["grid"]}>
        <Toggle value="grid">Grid</Toggle>
        <Toggle value="list">List</Toggle>
      </ToggleGroup>
      <Toggle defaultPressed>Loop</Toggle>
    </Stack>
  );
}
