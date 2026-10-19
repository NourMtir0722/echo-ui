"use client";

/** The live preview on /docs/tag. */
import { HardwareButton } from "@registry/echo/hardware-button";
import { Tag } from "@registry/echo/tag";
import { useState } from "react";
import { row } from "./shared/main-row";

const TAGS = ["Ambient", "Field recording", "Loop"];

function TagPreview() {
  const [tags, setTags] = useState(TAGS);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={row}>
        <Tag>Static</Tag>
        {tags.map((t) => (
          <Tag
            key={t}
            removeLabel={`Remove ${t}`}
            onRemove={() => setTags((cur) => cur.filter((x) => x !== t))}
          >
            {t}
          </Tag>
        ))}
      </div>
      <div style={row}>
        <HardwareButton size="sm" onClick={() => setTags(TAGS)} disabled={tags.length === TAGS.length}>
          Put them back
        </HardwareButton>
      </div>
    </div>
  );
}

export default function Preview() {
  return <TagPreview />;
}
