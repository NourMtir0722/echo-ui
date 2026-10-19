import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { Worker } from "node:worker_threads";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createEchoTheme } from "echo-ui-core/theme";

import { run } from "../index";
import { findLiterals, nearestRole, themeRoles } from "@registry/agent/check/colour";

/**
 * The check, run on a small Echo project against the catalog this repo
 * builds. One fixture file per mistake, each of which must be found, and a
 * clean file, which must pass.
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const publicDir = resolve(repoRoot, "apps/www/public");
const built = await access(join(publicDir, "r/catalog.json")).then(() => true, () => false);
const registry = pathToFileURL(join(publicDir, "e")).href;

/** An Echo project with HardwareButton, Switch, Field, Table and Item installed at the catalog's versions. */
async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "echo-check-"));
  const catalog = JSON.parse(await readFile(join(publicDir, "r/catalog.json"), "utf8")) as { components: { name: string; version?: string }[] };
  const version = (item: string) => catalog.components.find((c) => c.name === `echo-${item}`)!.version!;
  const items = ["hardware-button", "switch", "field", "table", "item"];
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { next: "16.3.5", react: "19.0.0" } }));
  await writeFile(join(root, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./*"] } } }));
  await writeFile(join(root, "echo.json"), JSON.stringify({ dir: "components/echo", framework: "next", packageManager: "npm", registry }));
  await writeFile(
    join(root, "echo-lock.json"),
    JSON.stringify({ lockVersion: 1, core: "0.2.0", items: Object.fromEntries(items.map((i) => [i, { version: version(i), files: {} }])) }),
  );
  await mkdir(join(root, "components/echo/hardware-button"), { recursive: true });
  await writeFile(join(root, "components/echo/echo-theme.css"), createEchoTheme().css);
  await writeFile(join(root, "components/echo/hardware-button/hardware-button.css"), ".echo-hw { } .echo-hw__cap { color: #fff; }\n");
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}

/** `check --json` on a project: the findings, and the exit code. */
async function check(root: string, args: string[] = []) {
  const out: string[] = [];
  const saved = { log: console.log, error: console.error };
  console.log = (...p: unknown[]) => void out.push(p.join(" "));
  console.error = (...p: unknown[]) => void out.push(p.join(" "));
  try {
    const code = await run(["check", ...args, "--json", "--cwd", root]);
    const body = JSON.parse(out.join("\n").slice(out.join("\n").indexOf("{"))) as { findings: { rule: string; file: string; line: number; message: string }[] };
    return { code, findings: body.findings };
  } finally {
    Object.assign(console, saved);
  }
}

const CLEAN = `"use client";
import { HardwareButton } from "@/components/echo/hardware-button";
import { Switch } from "@/components/echo/switch";
import { Field } from "@/components/echo/field";
import { Table } from "@/components/echo/table";
import { createEchoTheme } from "echo-ui-core/theme";

// A seed is where a colour belongs.
export const theme = createEchoTheme({ accent: "#3D8EF0" });

export default function Settings({ rest }: { rest: object }) {
  return (
    <main style={{ background: "var(--echo-well)", color: "var(--echo-text)" }}>
      <Field label="Email" type="email" autoComplete="email" />
      <Switch aria-label="Weekly digest" defaultChecked />
      <HardwareButton variant="primary" onClick={() => {}}>Save</HardwareButton>
      <HardwareButton iconOnly aria-label="Close" icon={null} />
      <HardwareButton {...rest} iconOnly />
      <Table caption="Recent orders">
        <Table.Body>
          <Table.Row>
            <Table.Cell numeric>42</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
      <img src="/logo.png" alt="" />
      <a href="/docs" className="echo-chassis">Docs</a>
      <div role="button" tabIndex={0} onClick={() => {}} onKeyDown={() => {}}>Row</div>
    </main>
  );
}
`;

test("colour literals are found, and named by the theme role they're nearest", () => {
  assert.deepEqual(findLiterals("1px solid #fff").map((l) => l.text), ["#fff"]);
  assert.deepEqual(findLiterals("color-mix(in oklch, var(--echo-accent), transparent)").map((l) => l.text), []);
  assert.deepEqual(findLiterals("url(data:image/svg+xml;%23fff)").map((l) => l.text), []);
  assert.deepEqual(findLiterals("card red", { named: false }), []);
  const theme = createEchoTheme();
  const roles = themeRoles(theme.css, ["--echo-accent", "--echo-well", "--echo-text"]);
  assert.equal(roles.length, 3);
  const accent = /--echo-accent:\s*(#[0-9a-f]{6})/i.exec(theme.css)![1]!;
  assert.deepEqual(nearestRole(accent, roles), { role: "--echo-accent", same: true });
  assert.equal(nearestRole("#ff0000", roles)?.same, false);
});

test("a clean Echo file passes", { skip: !built }, async () => {
  const root = await project({ "app/page.tsx": CLEAN, "app/globals.css": "body { background: var(--echo-well); }\n:focus-visible { outline: 2px solid var(--echo-accent); }\n" });
  try {
    const { code, findings } = await check(root);
    assert.deepEqual(findings, []);
    assert.equal(code, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/** Each mistake, alone in a file, and the rule that must catch it. */
const FIXTURES: Record<string, { rule: string; source: string; message: RegExp; path?: string }> = {
  "spacing off the scale": { rule: "space", path: "app/page.module.css", source: ".a { padding: 13px 8px; }\n", message: /is off Echo's spacing scale: write `padding: var\(--echo-space-6\) var\(--echo-space-4\)`/ },
  "spacing that is a step": { rule: "space", source: `export const A = () => <div style={{ gap: 8 }} />;`, message: /is Echo's spacing: write `gap: var\(--echo-space-4\)`, so the theme's density reaches it/ },
  "a radius off the scale": { rule: "radius", path: "app/page.module.css", source: ".a { border-radius: 7px; }\n", message: /write `border-radius: var\(--echo-radius-sm\)`, the nearest step/ },
  "a shadow drawn by hand": { rule: "shadow", path: "app/page.module.css", source: ".card { box-shadow: 0 4px 12px rgb(0 0 0 / 0.3); }\n", message: /one light: take a recipe, like `var\(--echo-shadow-panel\)`/ },
  "a recipe written out": {
    rule: "shadow",
    path: "app/page.module.css",
    source: ".x { box-shadow: inset 0 2px 5px color-mix(in oklab, var(--echo-cast-ink, black) calc(0.6 * var(--echo-shade, 1) * 100%), transparent), inset 0 -1px 0 rgb(255 255 255 / calc(0.05 * var(--echo-gloss, 1))); }\n",
    message: /is Echo's `well` shadow written out: write `var\(--echo-shadow-well\)`/,
  },
  "a focus ring drawn by hand": { rule: "shadow", path: "app/page.module.css", source: ".a:focus-visible { box-shadow: 0 0 0 2px var(--echo-accent); }\n", message: /is a focus ring drawn by hand: Echo's is `var\(--echo-shadow-ring\)`/ },
  "className on a closed component": {
    rule: "restyle",
    source: `import { Switch } from "@/components/echo/switch";\nexport const A = () => <Switch aria-label="Digest" className="scale-150" />;`,
    message: /Switch takes no `className`: Echo's components are closed/,
  },
  "project CSS reaching into Echo": { rule: "restyle", path: "app/globals.css", source: ".echo-hw__cap { border-radius: 0; }\n", message: /reaches into HardwareButton from outside/ },
  "a theme colour set outside the theme": { rule: "restyle", path: "app/globals.css", source: ".promo { --echo-accent: var(--brand); }\n", message: /`--echo-accent` is set outside the theme: a colour set here skips the contrast check/ },
  "a theme token set inline": {
    rule: "restyle",
    source: `export const A = ({ brand }: { brand: string }) => <section style={{ ["--echo-accent" as string]: brand, "--echo-space-4": "10px" }} />;`,
    message: /`--echo-space-4` is set outside the theme: the scales come from the seed's settings/,
  },
  "a field with no label": { rule: "label", source: `export const A = () => <input type="date" />;`, message: /`<input type="date">` has no label/ },
  "an error that's only a colour": {
    rule: "error-colour",
    source: `export const A = () => <input type="date" aria-label="Due" aria-invalid="true" />;`,
    message: /`aria-invalid` with nothing saying what's wrong/,
  },
  "an Echo field made invalid with no words": {
    rule: "error-colour",
    source: `import { Field } from "@/components/echo/field";\nexport const A = () => <Field label="Email" aria-invalid />;`,
    message: /set Field's `error` to what's wrong instead/,
  },
  "GSAP used straight beside Echo": {
    rule: "motion",
    source: `import gsap from "gsap";\nimport { HardwareButton } from "@/components/echo/hardware-button";\nexport const A = () => <HardwareButton onClick={() => gsap.to(".x", { y: 4 })}>Go</HardwareButton>;`,
    message: /Moves things with GSAP directly, beside Echo/,
  },
  "an animation with no reduced-motion fallback": { rule: "motion", path: "app/page.module.css", source: ".spin { animation: spin 1s linear infinite; }\n", message: /Animates with no reduced-motion fallback/ },
  "Tailwind's palette": { rule: "colour", source: `export const A = () => <p className="text-red-500 hover:bg-black/40">Failed</p>;`, message: /`text-red-500` is a colour from Tailwind's palette, not your theme.*said in words and shape/ },
  "another library's part on an Echo screen": {
    rule: "screen",
    source: `import { Button } from "@/components/ui/button";\nimport { HardwareButton } from "@/components/echo/hardware-button";\nexport const A = () => <><Button>Cancel</Button><HardwareButton>Save</HardwareButton></>;`,
    message: /Screen rule 1, one device: `@\/components\/ui\/button` is another library's part/,
  },
  "two lit caps in one form": {
    rule: "screen",
    source: `import { HardwareButton } from "@/components/echo/hardware-button";\nexport const A = () => <form><HardwareButton variant="primary">Save</HardwareButton><HardwareButton variant="primary">Publish</HardwareButton></form>;`,
    message: /Screen rule 2, one lit cap per decision: this form has 2 primary caps \("Save", "Publish"\)/,
  },
  "a delete on one press": {
    rule: "screen",
    source: `import { HardwareButton } from "@/components/echo/hardware-button";\nexport const A = ({ drop }: { drop: () => void }) => <HardwareButton onClick={drop}>Delete project</HardwareButton>;`,
    message: /Screen rule 4, nothing destructive happens on one press: "Delete project" happens on one press/,
  },
  "a confirmation that says OK": {
    rule: "screen",
    source: `import { AlertDialog } from "@/components/echo/alert-dialog";\nexport const A = () => <AlertDialog trigger="Delete" title="Delete it?" description="It can't be undone." confirmLabel="OK" />;`,
    message: /Screen rule 5, a confirmation names the consequence: "OK" doesn't say what happens/,
  },
  "a WebGL part loaded with the page": {
    rule: "weight",
    source: `import { ShaderField } from "@/components/echo/shader-field";\nexport const A = () => <ShaderField />;`,
    message: /ShaderField draws with WebGL: imported here, it loads with the page.*dynamic\(\(\) => import\("@\/components\/echo\/shader-field"\)\.then\(\(m\) => m\.ShaderField\), \{ ssr: false \}\)/,
  },
  "an invented duration": { rule: "timing", path: "app/page.module.css", source: ".a { transition: opacity 300ms ease; }\n", message: /`300ms` → `var\(--echo-duration-sweep\)` \(220ms\)/ },
  "Tailwind values off the scale": { rule: "space", source: `export const A = () => <div className="p-[13px] rounded-[9px] shadow-lg" />;`, message: /`p-\[13px\]` is off Echo's spacing scale: write `p-\[var\(--echo-space-6\)\]`/ },
  "a second animation library": {
    rule: "motion-library",
    source: `import { motion } from "framer-motion";\nimport { HardwareButton } from "@/components/echo/hardware-button";\nexport const A = () => <motion.div><HardwareButton>Save</HardwareButton></motion.div>;`,
    message: /`framer-motion` is a second animation library next to Echo's/,
  },
  "a raw hex": { rule: "colour", source: `export const A = () => <div style={{ color: "#8B6FE8" }} />;`, message: /use a role|is your/ },
  "a raw button": { rule: "lookalike", source: `export const A = () => <button onClick={() => {}}>Save</button>;`, message: /where Echo has HardwareButton/ },
  "an invented prop": {
    rule: "prop",
    source: `import { HardwareButton } from "@/components/echo/hardware-button";\nexport const A = () => <HardwareButton color="red">Save</HardwareButton>;`,
    message: /HardwareButton has no `color` prop\. Its look comes from `variant`: primary, neutral or ghost\./,
  },
  "a missing name": {
    rule: "name",
    source: `import { Switch } from "@/components/echo/switch";\nexport const A = () => <Switch defaultChecked />;`,
    message: /<Switch> has no name/,
  },
  "a clickable div": { rule: "keyboard", source: `export const A = () => <div onClick={() => {}}>Row</div>;`, message: /can't be reached by keyboard/ },
  "an image without alt": { rule: "img-alt", source: `export const A = () => <img src="/a.png" />;`, message: /has no `alt`/ },
  "a positive tabIndex": { rule: "tabindex", source: `export const A = () => <a href="/x" tabIndex={2}>x</a>;`, message: /tabIndex=\{2\}/ },
  "aria-hidden on a button": {
    rule: "lookalike",
    source: `export const A = () => <button aria-hidden="true">x</button>;`,
    message: /where Echo has HardwareButton/,
  },
};

for (const [name, fixture] of Object.entries(FIXTURES)) {
  test(`caught: ${name}`, { skip: !built }, async () => {
    const path = fixture.path ?? "app/page.tsx";
    const root = await project({ [path]: fixture.source });
    try {
      const { code, findings } = await check(root);
      assert.equal(code, 1, "a finding exits 1");
      const hit = findings.find((f) => f.rule === fixture.rule && fixture.message.test(f.message)) ?? findings.find((f) => f.rule === fixture.rule);
      assert.ok(hit, `no ${fixture.rule} finding in ${JSON.stringify(findings)}`);
      assert.match(hit.message, fixture.message);
      assert.equal(hit.file, path);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("caught: aria-hidden on something focusable", { skip: !built }, async () => {
  const root = await project({ "app/page.tsx": `export const A = () => <a href="/x" aria-hidden="true">x</a>;` });
  try {
    const { findings } = await check(root);
    assert.ok(findings.some((f) => f.rule === "hidden-focusable"), JSON.stringify(findings));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("caught: a focus ring removed, in the project's CSS", { skip: !built }, async () => {
  const root = await project({ "app/globals.css": "button:focus { outline: none; }\n.ok:focus-visible { outline: 0; box-shadow: var(--echo-shadow-ring); }\n" });
  try {
    const { findings } = await check(root);
    assert.deepEqual(findings.map((f) => [f.rule, f.line]), [["focus-ring", 1]]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a second animation library is only Echo's business in a file that uses Echo", { skip: !built }, async () => {
  const root = await project({ "app/intro.tsx": `import { motion } from "motion/react";\nexport const A = () => <motion.p>Hi</motion.p>;` });
  try {
    const { findings } = await check(root);
    assert.deepEqual(findings.filter((f) => f.rule === "motion-library"), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("page layout is the builder's: spacing past the component scale, rem steps and Tailwind's own utilities pass", { skip: !built }, async () => {
  const root = await project({
    "app/page.module.css": ".page { padding: 96px 48px; gap: var(--echo-space-6); margin: 0 auto; border-radius: 50%; transition: opacity var(--echo-duration-swap) ease; }\n",
    "app/page.tsx": `export const A = () => <div className="p-4 rounded-lg shadow-none" style={{ padding: "1.5rem 0" }} />;`,
  });
  try {
    const { findings } = await check(root);
    // The one thing said: a rem value that is a step.
    assert.deepEqual(findings.map((f) => f.rule), ["space"]);
    assert.match(findings[0]!.message, /`padding: 1\.5rem 0` is Echo's spacing: write `padding: var\(--echo-space-10\) 0`/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("edited and outdated Echo items are said, not counted", { skip: !built }, async () => {
  const root = await project({ "app/page.tsx": CLEAN });
  try {
    const lock = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    lock.items["hardware-button"].files = { "hardware-button/hardware-button.css": "0".repeat(64) };
    lock.items.switch.version = "0.0.1";
    await writeFile(join(root, "echo-lock.json"), JSON.stringify(lock));
    const out: string[] = [];
    const saved = console.log;
    console.log = (...p: unknown[]) => void out.push(p.join(" "));
    try {
      assert.equal(await run(["check", "--json", "--cwd", root]), 0, "information never fails the check");
    } finally {
      console.log = saved;
    }
    const body = JSON.parse(out.join("\n")) as { info: { kind: string; items: string[]; message: string }[] };
    const edited = body.info.find((i) => i.kind === "edited")!;
    assert.deepEqual(edited.items, ["hardware-button"]);
    assert.match(edited.message, /edited since it was installed \(hardware-button\/hardware-button\.css\)/);
    const behind = body.info.find((i) => i.kind === "behind")!;
    assert.deepEqual(behind.items, ["switch"]);
    assert.match(behind.message, /switch is 0\.0\.1 here and .* in the registry\. `npx echo-ui-cli update switch`/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a label, Echo's motion and a reduced-motion fallback are all it takes", { skip: !built }, async () => {
  const root = await project({
    "app/page.tsx": [
      `import gsap from "gsap";`,
      `import { motion } from "echo-ui-core/motion";`,
      `import { HardwareButton } from "@/components/echo/hardware-button";`,
      `export const A = () => (`,
      `  <form>`,
      `    <label>Due <input type="date" /></label>`,
      `    <label htmlFor="start">Start</label>`,
      `    <input id="start" type="time" />`,
      `    <input type="hidden" name="token" value="x" />`,
      `    <HardwareButton onClick={() => gsap.to(".x", motion.pop)}>Go</HardwareButton>`,
      `  </form>`,
      `);`,
    ].join("\n"),
    "app/page.module.css": ".spin { animation: spin 1s linear infinite; }\n@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }\n",
  });
  try {
    const { findings } = await check(root);
    assert.deepEqual(findings, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the screen rules trust wiring they can't read, and hint where they can't be sure", { skip: !built }, async () => {
  const root = await project({
    "app/page.tsx": [
      `import { HardwareButton } from "@/components/echo/hardware-button";`,
      `import { AlertDialog } from "@/components/echo/alert-dialog";`,
      `import { Field } from "@/components/echo/field";`,
      `import { useRouter } from "next/navigation";`,
      `export function A({ drop, setAskOpen }: { drop: () => void; setAskOpen: (o: boolean) => void }) {`,
      `  const router = useRouter();`,
      `  return (`,
      `    <form>`,
      `      <HardwareButton variant="primary">Save</HardwareButton>`,
      `      <HardwareButton onClick={() => setAskOpen(true)}>Delete</HardwareButton>`,
      `      <AlertDialog trigger={<HardwareButton>Remove</HardwareButton>} title="Remove it?" description="Gone for good." confirmLabel="Remove member" onConfirm={drop} />`,
      `      <AlertDialog trigger="Archive" title="Archive it?" description="You can bring it back." confirmLabel="Archive" destructive={false} />`,
      `      <HardwareButton onClick={() => router.push("/settings")}>Settings</HardwareButton>`,
      `      <Field label="Total" readOnly value="42" />`,
      `    </form>`,
      `  );`,
      `}`,
    ].join("\n"),
  });
  try {
    const out: string[] = [];
    const saved = console.log;
    console.log = (...p: unknown[]) => void out.push(p.join(" "));
    let code: number;
    try {
      code = await run(["check", "--json", "--cwd", root]);
    } finally {
      console.log = saved;
    }
    const body = JSON.parse(out.join("\n")) as { findings: { rule: string }[]; notes: { message: string }[] };
    assert.equal(code, 0, JSON.stringify(body.findings));
    assert.deepEqual(body.findings, []);
    const hints = body.notes.map((n) => n.message);
    assert.ok(hints.some((m) => /^Screen rule 6, interrupt only for a big mistake \(a hint\)/.test(m)), hints.join("\n"));
    assert.ok(hints.some((m) => /^Screen rule 7, same look, same behaviour \(a hint\): this cap only goes somewhere/.test(m)));
    assert.ok(hints.some((m) => /^Screen rule 8, materials keep their jobs \(a hint\)/.test(m)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("every screen rule the source can see has a check, and every check names a rule", async () => {
  const { SCREEN_RULES } = await import("@registry/agent/screen-rules");
  const { SCREEN_CHECKS, SCREEN_HINTS } = await import("@registry/agent/check/screen");
  assert.deepEqual([...SCREEN_CHECKS], SCREEN_RULES.filter((r) => r.seenBy === "source").map((r) => r.n));
  for (const n of SCREEN_HINTS) assert.equal(SCREEN_RULES.find((r) => r.n === n)?.seenBy, "judgement", `rule ${n} is hinted at, so the source can't be sure of it`);
});

test("a heavy part loaded when it's shown is fine", { skip: !built }, async () => {
  const root = await project({
    "app/page.tsx": `"use client";\nimport dynamic from "next/dynamic";\nconst ShaderField = dynamic(() => import("@/components/echo/shader-field").then((m) => m.ShaderField), { ssr: false });\nexport const A = () => <ShaderField />;`,
  });
  try {
    const { findings } = await check(root);
    assert.deepEqual(findings.filter((f) => f.rule === "weight"), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/** The project's echo.json with the team's own `check` added. */
async function withTeam(root: string, team: unknown) {
  const config = JSON.parse(await readFile(join(root, "echo.json"), "utf8"));
  await writeFile(join(root, "echo.json"), JSON.stringify({ ...config, check: team }));
}

test("the team's rules: one off, one said without counting, a banned import, a brand colour", { skip: !built }, async () => {
  const root = await project({
    "app/page.tsx": [
      `import { Search } from "lucide-react";`,
      `export const A = () => (`,
      `  <div style={{ color: "#FF5A1F", background: "#123456", padding: 13 }}>`,
      `    <Search />`,
      `    <button>Go</button>`,
      `  </div>`,
      `);`,
    ].join("\n"),
  });
  try {
    await withTeam(root, {
      rules: { lookalike: "off", space: "info" },
      ban: [{ import: "lucide-react", message: "our icons are in @/icons." }],
      colours: ["#ff5a1f"],
    });
    const out: string[] = [];
    const saved = { log: console.log, error: console.error };
    console.log = console.error = (...p: unknown[]) => void out.push(p.join(" "));
    let code: number;
    try {
      code = await run(["check", "--json", "--cwd", root]);
    } finally {
      Object.assign(console, saved);
    }
    const text = out.join("\n");
    const body = JSON.parse(text.slice(text.indexOf("{"))) as { findings: { rule: string; message: string }[]; notes: { message: string }[] };
    assert.equal(code, 1);
    // Off: the raw button says nothing. The brand colour passes; the other hex doesn't.
    assert.deepEqual(body.findings.map((f) => f.rule).sort(), ["colour", "team"]);
    assert.match(body.findings.find((f) => f.rule === "colour")!.message, /#123456/);
    assert.match(body.findings.find((f) => f.rule === "team")!.message, /`lucide-react` isn't used here: our icons are in @\/icons\./);
    // Info: said, not counted.
    assert.ok(body.notes.some((n) => /padding: 13px.*\(the team's rules: said, not counted\)/.test(n.message)), JSON.stringify(body.notes));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a mistake in the team's rules fails loudly, and the hook never hands it to the agent", { skip: !built }, async () => {
  const root = await project({ "app/page.tsx": CLEAN });
  try {
    await withTeam(root, { rules: { spcae: "off" } });
    const out: string[] = [];
    const saved = { log: console.log, error: console.error };
    console.log = console.error = (...p: unknown[]) => void out.push(p.join(" "));
    let code: number;
    try {
      code = await run(["check", "--cwd", root]);
    } finally {
      Object.assign(console, saved);
    }
    assert.equal(code, 1);
    assert.match(out.join("\n"), /names `spcae`, which isn't one of check's rules: colour, space/);
    const fromHook = await hook(JSON.stringify({ tool_input: { file_path: join(root, "app/page.tsx") } }), root);
    assert.equal(fromHook.code, 1, "the check failing is exit 1, never 2");
    assert.match(fromHook.stderr, /spcae/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Echo's folder is left out: its own files use raw elements on purpose", { skip: !built }, async () => {
  const root = await project({ "components/echo/switch/switch.tsx": `export const S = () => <button style={{ color: "#fff" }} />;` });
  try {
    const { code, findings } = await check(root);
    assert.deepEqual(findings, []);
    assert.equal(code, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a borrowed Echo class is named with the component it belongs to", { skip: !built }, async () => {
  const root = await project({ "app/page.tsx": `export const A = () => <span className="echo-hw__cap">x</span>;` });
  try {
    const { findings } = await check(root);
    assert.match(findings.find((f) => f.rule === "echo-class")!.message, /is HardwareButton's own class/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an explicit role says what a raw element is; a shadow drawn by hand is named as one", { skip: !built }, async () => {
  const root = await project({
    "app/page.tsx": `export const A = () => <button type="button" role="radio" aria-checked="true">Daily</button>;`,
    "app/page.module.css": ".card { box-shadow: 0 1px 2px rgb(0 0 0 / 0.55); color: #8B6FE8; background: rgb(255 255 255 / 0.1); }\n",
  });
  try {
    const { findings } = await check(root);
    assert.match(findings.find((f) => f.rule === "lookalike")!.message, /where Echo has RadioGroup/);
    // The shadow is one finding, not a shadow finding and a colour finding.
    assert.equal(findings.filter((f) => f.rule === "shadow").length, 1);
    const colours = findings.filter((f) => f.rule === "colour").map((f) => f.message);
    assert.equal(colours.length, 2);
    assert.match(colours[0]!, /is your accent: use `var\(--echo-accent\)`/);
    assert.match(colours[1]!, /light or shade drawn by hand/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("where several roles are the colour typed, the one for that property is named", { skip: !built }, async () => {
  // A drawn device in one black: the glow, the lit ink, the text and the
  // seam are all #050505. A hairline typed by hand was told to use the glow,
  // which turns it the accent's colour the day the project goes back to molded.
  const root = await project({
    "app/page.tsx": `export const A = () => <div style={{ borderBottom: "1px solid #050505", color: "#050505" }}>Fig. 02</div>;`,
    "app/page.module.css": ".rule { border-top: 1px solid #050505; background: #FDFDFD; }\n",
  });
  try {
    await writeFile(join(root, "components/echo/echo-theme.css"), createEchoTheme({ accent: "#050505", chassis: "#FDFDFD", paper: "#050505", render: "drawn" }).css);
    const { findings } = await check(root);
    const said = (file: string) => findings.filter((f) => f.rule === "colour" && f.file === file).map((f) => f.message);
    assert.deepEqual(said("app/page.tsx"), [
      "`#050505` is your seam: use `var(--echo-seam)`.",
      "`#050505` is your text: use `var(--echo-text)`.",
    ]);
    assert.deepEqual(said("app/page.module.css"), [
      "`#050505` is your seam: use `var(--echo-seam)`.",
      "`#FDFDFD` is your surface: use `var(--echo-surface)`.",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a wrong value for a variant is named with the ones that exist", { skip: !built }, async () => {
  const root = await project({
    "app/page.tsx": `import { HardwareButton } from "@/components/echo/hardware-button";\nexport const A = () => <HardwareButton variant="destructive">Delete</HardwareButton>;`,
  });
  try {
    const { findings } = await check(root);
    assert.match(findings[0]!.message, /`variant` on HardwareButton is primary, neutral or ghost, not "destructive"\./);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("props are checked against the installed version, and skipped with a note when it differs", { skip: !built }, async () => {
  const root = await project({
    "app/page.tsx": `import { Switch } from "@/components/echo/switch";\nexport const A = () => <Switch invented />;`,
  });
  try {
    const lock = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    lock.items.switch.version = "0.0.1";
    await writeFile(join(root, "echo-lock.json"), JSON.stringify(lock));
    const out: string[] = [];
    const saved = console.log;
    console.log = (...p: unknown[]) => void out.push(p.join(" "));
    try {
      assert.equal(await run(["check", "--cwd", root]), 0);
    } finally {
      console.log = saved;
    }
    assert.match(out.join("\n"), /switch's props aren't checked here: this project has 0\.0\.1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/* ---------------------------------------------------------------- the hook */

async function hook(stdin: string, root: string): Promise<{ code: number; stderr: string }> {
  const lines: string[] = [];
  const saved = console.error;
  console.error = (...p: unknown[]) => void lines.push(p.join(" "));
  try {
    const { check: runCheck } = await import("../commands/check");
    const { reporter } = await import("../output");
    const code = await runCheck({ root, files: [], hook: true, stdin }, reporter(false));
    return { code, stderr: lines.join("\n") };
  } finally {
    console.error = saved;
  }
}

test("the hook hands findings back to the agent with exit 2, and stays quiet on a clean file", { skip: !built }, async () => {
  const root = await project({ "app/bad.tsx": `export const A = () => <button>x</button>;`, "app/good.tsx": CLEAN, "notes.md": "# not checked" });
  try {
    const bad = await hook(JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(root, "app/bad.tsx") } }), root);
    assert.equal(bad.code, 2);
    assert.match(bad.stderr, /app\/bad\.tsx:1:\d+ {2}<button> where Echo has HardwareButton/);
    assert.equal((await hook(JSON.stringify({ tool_input: { file_path: join(root, "app/good.tsx") } }), root)).code, 0);
    assert.equal((await hook(JSON.stringify({ tool_input: { file_path: join(root, "notes.md") } }), root)).code, 0);
    // An Edit to a file outside any Echo project: not ours. (In a folder of its own, made for the
    // test, rather than at a name anyone could have put in the shared temp folder first.)
    const elsewhere = await mkdtemp(join(tmpdir(), "echo-elsewhere-"));
    try {
      assert.equal((await hook(JSON.stringify({ tool_input: { file_path: join(elsewhere, "elsewhere.tsx") } }), root)).code, 0);
    } finally {
      await rm(elsewhere, { recursive: true, force: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/**
 * An echo.json with a syntax error read as no echo.json at all, so
 * the hook, the check and the Stop gate went quiet: every edit passed, and
 * nobody was told why.
 */
test("an echo.json that isn't JSON stops the check and the hook, and says so", { skip: !built }, async () => {
  const root = await project({ "app/bad.tsx": `export const A = () => <button>x</button>;` });
  try {
    const config = join(root, "echo.json");
    await writeFile(config, (await readFile(config, "utf8")).replace(/}$/, ',"check":{}, }'));

    const edited = await hook(JSON.stringify({ tool_input: { file_path: join(root, "app/bad.tsx") } }), root);
    // Exit 1, which the person sees; never 0 (silence) or 2 (the agent's to fix).
    assert.equal(edited.code, 1);
    assert.match(edited.stderr, /echo\.json isn't valid JSON/);

    const lines: string[] = [];
    const saved = console.error;
    console.error = (...p: unknown[]) => void lines.push(p.join(" "));
    try {
      assert.equal(await run(["check", "--cwd", root]), 1);
      const { check: runCheck } = await import("../commands/check");
      const { reporter } = await import("../output");
      assert.equal(await runCheck({ root, files: [], stop: true, stdin: JSON.stringify({ cwd: root }) }, reporter(false)), 1);
    } finally {
      console.error = saved;
    }
    assert.equal(lines.filter((l) => /echo\.json isn't valid JSON/.test(l)).length, 2, lines.join("\n"));
    assert.ok(!lines.some((l) => /No echo\.json here/.test(l)), lines.join("\n"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an edit inside Echo's folder is context for the agent, never a block", { skip: !built }, async () => {
  const root = await project({});
  try {
    const lock = JSON.parse(await readFile(join(root, "echo-lock.json"), "utf8"));
    lock.items["hardware-button"].files = { "hardware-button/hardware-button.css": "0".repeat(64) };
    await writeFile(join(root, "echo-lock.json"), JSON.stringify(lock));
    const printed: string[] = [];
    const saved = console.log;
    console.log = (...p: unknown[]) => void printed.push(p.join(" "));
    try {
      const own = await hook(JSON.stringify({ tool_input: { file_path: join(root, "components/echo/hardware-button/hardware-button.css") } }), root);
      assert.equal(own.code, 0);
      const mine = await hook(JSON.stringify({ tool_input: { file_path: join(root, "components/echo/my-card.tsx") } }), root);
      assert.equal(mine.code, 0);
    } finally {
      console.log = saved;
    }
    const [own, mine] = printed.map((line) => JSON.parse(line) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } });
    assert.equal(own!.hookSpecificOutput.hookEventName, "PostToolUse");
    assert.match(own!.hookSpecificOutput.additionalContext, /is Echo's own file \(hardware-button\)\. Editing it is allowed/);
    assert.match(mine!.hookSpecificOutput.additionalContext, /Echo's folder, which the check doesn't read.*Put your own components outside it/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/**
 * `init` writes the theme outside the lock, so an edit to it read as
 * a new file in Echo's folder, and the agent was told to put its components
 * elsewhere. The theme is written from the seed: the note says so, and names
 * the command that changes a setting.
 */
test("an edit to the theme file points the agent at `style set`", { skip: !built }, async () => {
  const root = await project({});
  try {
    const printed: string[] = [];
    const saved = console.log;
    console.log = (...p: unknown[]) => void printed.push(p.join(" "));
    try {
      assert.equal((await hook(JSON.stringify({ tool_input: { file_path: join(root, "components/echo/echo-theme.css") } }), root)).code, 0);
    } finally {
      console.log = saved;
    }
    const note = (JSON.parse(printed[0]!) as { hookSpecificOutput: { additionalContext: string } }).hookSpecificOutput.additionalContext;
    assert.match(note, /written from the seed in echo\.json/);
    assert.match(note, /style set <setting> <value>/);
    assert.doesNotMatch(note, /Put your own components outside it/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/**
 * A crash that exited 2 would hand the agent the check's own bug to "fix" on
 * every edit. The check failing is exit 1, which Claude Code shows the person.
 */
test("the check failing is never exit 2", { skip: !built }, async () => {
  const root = await project({});
  try {
    assert.equal((await hook("this is not json", root)).code, 1);
    // A path the check can't read as a file (a folder named like a page).
    await mkdir(join(root, "app/folder.tsx"), { recursive: true });
    const crash = spawnSync(process.execPath, ["--import", "tsx", resolve(repoRoot, "packages/cli/src/index.ts"), "check", "--hook"], {
      input: JSON.stringify({ tool_input: { file_path: join(root, "app/folder.tsx") } }),
      cwd: resolve(repoRoot, "packages/cli"),
      encoding: "utf8",
    });
    assert.equal(crash.status, 1, crash.stderr);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/**
 * The process reports its own CPU time as it exits: work done, start included, and none of the time spent
 * waiting for a turn on a busy machine, which the clock on the wall counts too.
 */
const REPORT_CPU = `data:text/javascript,${encodeURIComponent(
  'process.on("exit", () => { const u = process.cpuUsage(); process.stderr.write("\\n@cpu " + (u.user + u.system) / 1000); });',
)}`;

/** What checking one file costs, process start included: the CPU time of the process that does it, in ms. */
function checkCost(root: string) {
  const result = spawnSync(
    process.execPath,
    ["--import", REPORT_CPU, "--import", "tsx", resolve(repoRoot, "packages/cli/src/index.ts"), "check", "app/page.tsx", "--cwd", root],
    { cwd: resolve(repoRoot, "packages/cli"), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const cpu = Number(/@cpu ([\d.]+)/.exec(result.stderr)?.[1]);
  assert.ok(Number.isFinite(cpu), `the check didn't report its time: ${result.stderr}`);
  return Math.round(cpu);
}

test("one file checks in well under two seconds, process start included", { skip: !built }, async () => {
  const root = await project({ "app/page.tsx": CLEAN });
  try {
    const ms = checkCost(root);
    // Measured from TypeScript source through tsx, which costs more than the
    // bundled CLI a project runs; the bundle is faster still.
    assert.ok(ms < 2000, `one file took ${ms}ms`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/**
 * The budget above is for the check, not for the machine it runs on: in the
 * parallel `pnpm test`, with every package's tests beside it (and a dev
 * server building), one file "took" 2,174ms on CI and 2,041ms locally,
 * against about 250ms alone. Kept busy on purpose here, the
 * machine mustn't change what the check is said to cost.
 */
test("a check's cost is its own, however busy the machine is", { skip: !built }, async () => {
  const root = await project({ "app/page.tsx": CLEAN });
  const spin: Worker[] = [];
  try {
    const alone = checkCost(root);
    for (let i = 0; i < availableParallelism() * 3; i++) spin.push(new Worker("for (;;) {}", { eval: true }));
    await new Promise((r) => setTimeout(r, 200));
    const busy = checkCost(root);
    assert.ok(busy < alone * 1.6 + 150, `alone ${alone}ms, beside a busy machine ${busy}ms`);
  } finally {
    await Promise.all(spin.map((w) => w.terminate()));
    await rm(root, { recursive: true, force: true });
  }
});

test("every item a lookalike points to is one Echo has", { skip: !built }, async () => {
  const { lookalikeItem } = await import("@registry/agent/check/rules");
  const catalog = JSON.parse(await readFile(join(publicDir, "r/catalog.json"), "utf8")) as { components: { name: string }[] };
  const names = new Set(catalog.components.map((c) => c.name.replace(/^echo-/, "")));
  const el = (tag: string, attrs: Record<string, string> = {}) => ({
    tag,
    intrinsic: true,
    line: 1,
    column: 1,
    spread: false,
    hasChildren: false,
    attrs: Object.entries(attrs).map(([name, text]) => ({ name, value: { kind: "string" as const, text }, line: 1, column: 1 })),
  });
  const cases = [
    ...["button", "select", "dialog", "textarea", "progress", "meter"].map((t) => el(t)),
    ...["checkbox", "radio", "range", "number", "submit", "text", "email", "password", "search", "tel", "url"].map((type) => el("input", { type })),
    ...["switch", "checkbox", "radio", "radiogroup", "slider", "tab", "tablist", "dialog", "alertdialog", "progressbar", "combobox", "listbox", "menu"].map((role) => el("div", { role })),
  ];
  const missing = cases.map((c) => lookalikeItem(c)).filter((item) => !item || !names.has(item));
  assert.deepEqual(missing, []);
});
