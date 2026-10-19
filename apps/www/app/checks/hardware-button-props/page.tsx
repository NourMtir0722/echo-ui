import { HardwareButton } from "@registry/echo/hardware-button";
import { Menu } from "@registry/echo/menu";

export const metadata = { title: "HardwareButton props fixture", robots: { index: false, follow: false } };

/**
 * A test fixture: a HardwareButton handed a `className` and a `style` it
 * didn't ask for. Its type doesn't take either, but they still arrive, from
 * a Base UI part that renders the cap (Menu.Trigger passes its own class) or
 * from JavaScript. They used to replace the cap's own class and its fill;
 * tests/hardware-button.spec.ts checks they're added to them. It
 * also holds a small cap with a two-character label, which must still be a
 * 44px target on a touch screen, and a cap that's a link, which
 * must stay inside its well in a narrow column like a button does.
 */
export default function HardwareButtonPropsFixture() {
  const extra = { style: { minWidth: 180 }, className: "mine" } as object;
  return (
    <main style={{ padding: "var(--echo-space-10)", display: "flex", gap: "var(--echo-space-6)" }}>
      <HardwareButton data-testid="filled" fill={0.5} {...extra}>
        Half full
      </HardwareButton>
      {/* A small cap whose label is shorter than a finger is wide. */}
      <HardwareButton data-testid="short-sm" size="sm">
        $5
      </HardwareButton>
      {/* A cap that's a link: an <a>, which the browser doesn't size the way it sizes a <button>. */}
      <HardwareButton data-testid="link-cap" href="#install">
        Read the install guide
      </HardwareButton>
      <Menu>
        <Menu.Trigger render={<HardwareButton data-testid="menu-trigger">Actions</HardwareButton>} />
        <Menu.Content>
          <Menu.Item>Rename</Menu.Item>
        </Menu.Content>
      </Menu>
    </main>
  );
}
