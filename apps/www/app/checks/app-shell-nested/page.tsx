import { AppShell } from "@registry/echo/app-shell";

export const metadata = { title: "Nested shell fixture", robots: { index: false, follow: false } };

/**
 * A test fixture: a whole app screen (an embedded AppShell, with its own
 * sidebar) shown inside a page that uses the shell bare, the way the homepage
 * frames the Console template. The bare page's rules must stay on the bare
 * page: the screen inside keeps its sidebar and its content column;
 * tests/app-shell.spec.ts checks it.
 */
export default function NestedShellFixture() {
  return (
    <AppShell bare>
      <AppShell.Rail label="Fixture" brand={<strong>Echo</strong>}>
        <a href="/docs">Docs</a>
      </AppShell.Rail>
      <AppShell.Content>
        <div style={{ width: 1100, margin: "40px auto" }}>
          <AppShell embedded data-testid="nested-shell">
            <AppShell.Rail label="Screen" brand={<strong>Screen</strong>} />
            <AppShell.Sidebar label="Screen nav">
              <a href="/docs" aria-current="page">
                Channel 1
              </a>
            </AppShell.Sidebar>
            <AppShell.Content>
              <p data-testid="nested-content">The screen&rsquo;s own content, beside its sidebar.</p>
            </AppShell.Content>
          </AppShell>
        </div>
      </AppShell.Content>
    </AppShell>
  );
}
