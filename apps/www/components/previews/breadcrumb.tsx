"use client";

/** The live preview on /docs/breadcrumb. */
import { Breadcrumb } from "@registry/echo/breadcrumb";

export default function Preview() {
  return (
    <Breadcrumb
      items={[
        { label: "Home", href: "#" },
        { label: "Device", href: "#" },
        { label: "Inputs", href: "#" },
        { label: "Input 2" },
      ]}
    />
  );
}
