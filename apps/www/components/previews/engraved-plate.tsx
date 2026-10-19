"use client";

/** The live preview on /docs/engraved-plate. */
import { EngravedPlate } from "@registry/echo/engraved-plate";
import { row } from "./shared/main-row";

export default function Preview() {
  return (
    <div style={row}>
      <EngravedPlate>Owed 4</EngravedPlate>
      <EngravedPlate tilt={-5}>Model 002</EngravedPlate>
      <EngravedPlate rivets={false}>Serial 4417</EngravedPlate>
    </div>
  );
}
