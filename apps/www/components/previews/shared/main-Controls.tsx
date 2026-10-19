"use client";

import type { ReactNode } from "react";
import { row } from "./main-row";

export function Controls({ children }: { children: ReactNode }) {
  return <div style={{ ...row, gap: 10 }}>{children}</div>;
}
