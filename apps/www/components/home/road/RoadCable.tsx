"use client";

/**
 * The road itself (Workflow.tsx lays it out): the patch cable, and a jack at
 * each stop, lit once Echo has reached it.
 *
 * None of it exists until the section has measured itself in the browser, so
 * it's its own chunk, its styles with it (road-cable.css): nothing of it
 * stands between a visitor and the hero's first paint.
 */
import type { Layout } from "./road";
import "./road-cable.css";

export function RoadCable({ lay, reached }: { lay: Layout; reached: number }) {
  return (
    <>
      <svg className="hiw__road" width={lay.width} height={lay.height} viewBox={`0 0 ${lay.width} ${lay.height}`} aria-hidden="true">
        <path className="hiw__road-lip" d={lay.road.d} />
        <path className="hiw__road-edge" d={lay.road.d} />
        <path className="hiw__road-bed" d={lay.road.d} />
        <path className="hiw__road-shine" d={lay.road.d} />
      </svg>
      {lay.stations.map((st, i) => {
        const p = lay.road.at(st.s);
        return <span key={i} className="hiw-station" aria-hidden="true" data-lit={i < reached ? "" : undefined} style={{ left: p.x, top: p.y }} />;
      })}
    </>
  );
}
