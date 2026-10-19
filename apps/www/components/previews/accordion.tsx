"use client";

/** The live preview on /docs/accordion. */
import { Accordion } from "@registry/echo/accordion";

export default function Preview() {
  return (
    <div style={{ maxWidth: 460 }}>
      <Accordion multiple={false}>
        <Accordion.Item value="a">
          <Accordion.Trigger>Signal</Accordion.Trigger>
          <Accordion.Panel>
            The one saturated color is the aura; everything else is lit material.
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Trigger>Power</Accordion.Trigger>
          <Accordion.Panel>Battery, sleep, and the snooze key live here.</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
