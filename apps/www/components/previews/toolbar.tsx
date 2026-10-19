"use client";

/** The live preview on /docs/toolbar. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Stack } from "@registry/echo/layout";
import { Toggle,ToggleGroup } from "@registry/echo/toggle";
import { ButtonGroup,Toolbar,ToolbarButton,ToolbarSeparator } from "@registry/echo/toolbar";
import { GlyphB } from "./shared/main-GlyphB";
import { GlyphI } from "./shared/main-GlyphI";

export default function Preview() {
  return (
    <Stack gap={8} align="start">
      <Toolbar aria-label="Formatting">
        <ToggleGroup aria-label="Text style" multiple>
          <Toggle value="bold" aria-label="Bold" icon={<GlyphB />} />
          <Toggle value="italic" aria-label="Italic" icon={<GlyphI />} />
        </ToggleGroup>
        <ToolbarSeparator />
        <ToolbarButton>Undo</ToolbarButton>
        <ToolbarButton>Redo</ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton variant="primary">Publish</ToolbarButton>
      </Toolbar>
      <ButtonGroup aria-label="Steps">
        <HardwareButton>Back</HardwareButton>
        <HardwareButton>Next</HardwareButton>
      </ButtonGroup>
    </Stack>
  );
}
