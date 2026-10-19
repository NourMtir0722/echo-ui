import { Accordion } from "@registry/echo/accordion";
import { ContextMenu, Menu } from "@registry/echo/menu";
import { RadioGroup } from "@registry/echo/radio-group";
import { Sheet } from "@registry/echo/sheet";
import { Tabs } from "@registry/echo/tabs";

export const metadata = { title: "Server component fixture", robots: { index: false, follow: false } };

/**
 * A test fixture: every compound component (the ones with `.Part`s) used from
 * a server component, the way an App Router page uses them. If any part fails
 * to cross the server/client boundary, the build fails here.
 */
export default function ServerComponentFixture() {
  return (
    <article>
      <h1>AppShell from a server layout</h1>
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">One</Tabs.Tab>
          <Tabs.Tab value="two">Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">First panel</Tabs.Panel>
        <Tabs.Panel value="two">Second panel</Tabs.Panel>
      </Tabs>
      <Accordion>
        <Accordion.Item value="a">
          <Accordion.Trigger>Section</Accordion.Trigger>
          <Accordion.Panel>Body</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      <RadioGroup defaultValue="a" aria-label="Choice">
        <RadioGroup.Item value="a">A</RadioGroup.Item>
        <RadioGroup.Item value="b">B</RadioGroup.Item>
      </RadioGroup>
      <Menu>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Rename</Menu.Item>
        </Menu.Content>
      </Menu>
      <ContextMenu>
        <ContextMenu.Trigger>Right-click here</ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>Copy</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
      <Sheet>
        <Sheet.Trigger>Open sheet</Sheet.Trigger>
        <Sheet.Content title="Sheet">Contents</Sheet.Content>
      </Sheet>
    </article>
  );
}
