"use client";

/** The live preview on /docs/tags-input. */
import { TagsInput } from "@registry/echo/tags-input";

export default function Preview() {
  return (
    <div style={{ width: "min(380px, 100%)" }}>
      <TagsInput
        label="Invite"
        placeholder="name@example.com"
        defaultValue={["ada@example.com"]}
        normalize={(t) => (/^\S+@\S+\.\S+$/.test(t.trim()) ? t.trim().toLowerCase() : null)}
      />
    </div>
  );
}
