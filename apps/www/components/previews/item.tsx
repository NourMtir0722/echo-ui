"use client";

/** The live preview on /docs/item. */
import { Avatar } from "@registry/echo/avatar";
import { Checkbox } from "@registry/echo/checkbox";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Item } from "@registry/echo/item";
import { Stack } from "@registry/echo/layout";
import { useState } from "react";

function ItemPreview() {
  const [archived, setArchived] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [opened, setOpened] = useState(false);
  const rows = [
    { name: "Ada Lovelace", role: "Owner", when: "2m" },
    { name: "Alan Turing", role: "Editor", when: "1h" },
    { name: "Grace Hopper", role: "Viewer", when: "Mon" },
  ].filter((r) => !archived.includes(r.name));
  return (
    <div style={{ width: "min(440px, 100%)" }}>
      <Stack as="ul" gap={0} aria-label="Team">
        {rows.map((r) => (
          <Item
            key={r.name}
            as="li"
            media={<Avatar name={r.name} size="sm" />}
            title={r.name}
            description={r.role}
            trailing={r.when}
            swipeActions={[{ label: "Archive", onSelect: () => setArchived((a) => [...a, r.name]) }]}
          />
        ))}
      </Stack>
      {archived.length ? (
        <HardwareButton size="sm" variant="ghost" onClick={() => setArchived([])}>
          Bring them back
        </HardwareButton>
      ) : null}
      <Stack as="ul" gap={0} aria-label="Tasks">
        <Item
          as="li"
          media={<Checkbox aria-label="Done: Book the Q4 planning room" checked={done} onCheckedChange={setDone} />}
          title="Book the Q4 planning room"
          description={opened ? "Opened" : "Press the row to open it"}
          onClick={() => setOpened(true)}
        />
      </Stack>
    </div>
  );
}

export default function Preview() {
  return <ItemPreview />;
}
