"use client";

/** The live preview on /docs/loader. */
import { Loader } from "@registry/echo/loader";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <Loader />
      <Loader dot={6} label="Saving" />
    </div>
  );
}
