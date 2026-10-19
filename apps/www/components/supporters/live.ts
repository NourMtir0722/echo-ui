/**
 * Who's on the island, as the supporters server says now: supporters put
 * themselves on it from the thank-you page, so the list isn't part of the
 * site's build. Read once per page, however many parts of it ask (the island,
 * the crowd, the heap, the footer's line).
 *
 * While it's on its way the answer is `null`. If the server can't be reached
 * it's an empty list that isn't `known`: the island still opens, with Noor
 * alone, and nothing claims there's no one on it.
 */
import { useEffect, useState } from "react";
import type { Supporter } from "@/components/support/supporters";
import { supportersApi } from "./api";
import { readIsland } from "./submission";

export interface Island {
  supporters: readonly Supporter[];
  /** The number the next supporter will get; unknown when the server couldn't be asked. */
  next?: number;
  /** Whether the server answered: an empty list it gave means there's no one yet. */
  known: boolean;
}

const UNKNOWN: Island = { supporters: [], known: false };
let asked: Promise<Island> | undefined;

/** The island's list: one request per page load, shared. A failed one is asked again by the next caller. */
export function loadIsland(): Promise<Island> {
  asked ??= fetch(`${supportersApi()}/supporters`)
    .then((r) => (r.ok ? r.json() : undefined))
    .then((body) => {
      const read = readIsland(body);
      if (!read) throw new Error("not the island's list");
      return { ...read, known: true };
    })
    .catch(() => {
      asked = undefined;
      return UNKNOWN;
    });
  return asked;
}

/** The island's list in a component: `null` until it's here. */
export function useIsland(): Island | null {
  const [island, setIsland] = useState<Island | null>(null);
  useEffect(() => {
    let gone = false;
    void loadIsland().then((i) => !gone && setIsland(i));
    return () => {
      gone = true;
    };
  }, []);
  return island;
}
