"use client";

/** The live preview on /docs/pagination. */
import { Pagination } from "@registry/echo/pagination";
import { useState } from "react";
import { caption } from "./shared/main-caption";

function PaginationPreview() {
  const [page, setPage] = useState(1);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Pagination page={page} count={20} onPageChange={setPage} />
      <Pagination page={page} count={20} siblings={2} onPageChange={setPage} label="Wide window" />
      <span style={caption}>page {page} of 20 — the control never changes width</span>
    </div>
  );
}

export default function Preview() {
  return <PaginationPreview />;
}
