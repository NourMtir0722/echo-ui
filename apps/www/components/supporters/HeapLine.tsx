"use client";

/**
 * The footer's line about the heap above it: some of those Echos are Echo's
 * supporters (echo3d/stage.ts names them when pointed at). Said only once the
 * supporters server has answered that there are some (live.ts).
 */
import { useIsland } from "./live";

export function HeapLine({ className }: { className: string }) {
  const island = useIsland();
  if (!island?.supporters.length) return null;
  return (
    <p className={className}>
      Some of the Echos above are Echo&rsquo;s supporters: point at one, or <a href="/supporters">visit the island</a>.
    </p>
  );
}
