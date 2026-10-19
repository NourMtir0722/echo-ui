/** "What Echo puts in your project": the table, from footprintRows. */
import type { ReactNode } from "react";

import { footprintRows } from "./footprint-rows";

/** The list's sentences carry `code` spans; nothing else. */
function code(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, i) => (part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part));
}

export function Footprint() {
  return (
    <div className="guide__table" tabIndex={0} role="region" aria-label="What init puts in your project">
      <table>
        <thead>
          <tr>
            <th scope="col">What</th>
            <th scope="col">Where</th>
            <th scope="col">Why it's there</th>
            <th scope="col">How it comes out</th>
          </tr>
        </thead>
        <tbody>
          {footprintRows().map((row) => (
            <tr key={row.id}>
              <th scope="row">
                {code(row.what)}
                <br />
                <small>{row.kind}</small>
              </th>
              <td>
                {row.where.map((path) => (
                  <code key={path}>{path}</code>
                ))}
              </td>
              <td>{code(row.why)}</td>
              <td>{code(row.removal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
