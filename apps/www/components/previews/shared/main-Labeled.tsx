"use client";

import type { ReactNode } from "react";
import { caption } from "./main-caption";

export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", ...caption }}>
      {children}
      {label}
    </span>
  );
}
