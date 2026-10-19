"use client";

/** The live preview on /docs/badge. */
import { Badge } from "@registry/echo/badge";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Badge>Neutral</Badge>
      <Badge variant="accent">Rec</Badge>
      <Badge variant="lcd">12</Badge>
      <Badge variant="outline">Draft</Badge>
      <Badge size="sm">sm</Badge>
    </div>
  );
}
