"use client";

/** The live preview on /docs/side-nav. */
import { Stack } from "@registry/echo/layout";
import { SideNav } from "@registry/echo/side-nav";
import { Toggle } from "@registry/echo/toggle";
import { useState } from "react";
import { ICONS } from "./shared/main-ICONS";

function SideNavPreview() {
  const [current, setCurrent] = useState("/inbox");
  const [collapsed, setCollapsed] = useState(false);
  return (
    <Stack direction="row" gap={10} align="start">
      <SideNav
        label="Workspace"
        current={current}
        collapsed={collapsed}
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
        groups={[
          {
            items: [
              { label: "Inbox", href: "/inbox", icon: ICONS.inbox, badge: 3 },
              { label: "Drafts", href: "/drafts", icon: ICONS.drafts },
            ],
          },
          {
            label: "Projects",
            items: [
              {
                label: "Echo",
                icon: ICONS.board,
                items: [
                  { label: "Board", href: "/echo/board" },
                  { label: "Docs", href: "/echo/docs" },
                ],
              },
              { label: "Guides", href: "/guides", icon: ICONS.docs },
            ],
          },
        ]}
      />
      <Toggle pressed={collapsed} onPressedChange={setCollapsed}>
        Fold
      </Toggle>
    </Stack>
  );
}

export default function Preview() {
  return <SideNavPreview />;
}
