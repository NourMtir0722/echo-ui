"use client";

/** The live preview on /docs/tab-bar. */
import { TabBar } from "@registry/echo/tab-bar";
import { useState } from "react";
import { ICONS } from "./shared/main-ICONS";

function TabBarPreview() {
  const [current, setCurrent] = useState("/today");
  return (
    <div style={{ width: "min(390px, 100%)" }}>
      <TabBar
        label="Main"
        fixed={false}
        current={current}
        renderLink={({ href, onClick, ...p }) => (
          <a
            {...p}
            href={href}
            onClick={(e) => {
              e.preventDefault();
              setCurrent(href);
              onClick?.();
            }}
          />
        )}
        items={[
          { label: "Today", href: "/today", icon: ICONS.home },
          { label: "Search", href: "/search", icon: ICONS.search },
          { label: "Inbox", href: "/inbox", icon: ICONS.inbox, badge: 2 },
          { label: "You", href: "/you", icon: ICONS.user },
        ]}
      />
    </div>
  );
}

export default function Preview() {
  return <TabBarPreview />;
}
