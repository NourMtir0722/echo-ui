"use client";

/** The live preview on /docs/link. */
import { Link } from "@registry/echo/link";

export default function Preview() {
  return (
    <p style={{ color: "var(--echo-text-dim)", fontSize: 14, maxWidth: "46ch", margin: 0 }}>
      Read the <Link href="/docs/theming">theming guide</Link> first, then check what{" "}
      <Link href="https://base-ui.com" external>
        Base UI
      </Link>{" "}
      handles for you.
    </p>
  );
}
