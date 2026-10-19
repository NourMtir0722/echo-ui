"use client";

/** The live preview on /docs/checkbox-group. */
import { CheckboxGroup } from "@registry/echo/checkbox-group";

export default function Preview() {
  return (
    <CheckboxGroup
      label="Email me about"
      parent="Everything"
      defaultValue={["mentions"]}
      options={[
        { value: "mentions", label: "Mentions" },
        { value: "replies", label: "Replies" },
        { value: "digest", label: "Weekly digest", description: "Mondays, 9am" },
      ]}
    />
  );
}
