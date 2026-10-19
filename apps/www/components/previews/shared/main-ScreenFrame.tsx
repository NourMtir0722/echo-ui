"use client";

import type { ReactNode } from "react";

export function ScreenFrame({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div className="echo-docpreview" style={{ height, overflow: "auto", borderRadius: 12 }}>
      {children}
    </div>
  );
}
