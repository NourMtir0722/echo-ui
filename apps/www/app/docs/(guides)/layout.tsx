import type { ReactNode } from "react";
import { GuidePager } from "@/components/guides/GuidePager";
import "@/components/component-doc.css";
import "@/components/guides/guide.css";

/** Every guide page: the component pages' frame, then a pager. */
export default function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <article className="doc guide">
      {children}
      <GuidePager />
    </article>
  );
}
