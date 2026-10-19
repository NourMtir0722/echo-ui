/**
 * A headless browser for the checks that need a rendered page (`check --url`,
 * `test`, `check --stop`): the Chrome already on the machine, driven over the
 * DevTools protocol with nothing installed, or the project's own Playwright
 * when there's no Chrome. It never installs a browser.
 *
 * Chrome is found where it installs itself (or at `ECHO_CHROME`), started
 * with a profile of its own that is deleted afterwards, and spoken to over
 * the WebSocket it opens: Node's own, from Node 22 (on an older Node, only
 * Playwright can drive it).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { pathToFileURL } from "node:url";

export class BrowserError extends Error {}

export interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CheckPage {
  /** Load it and let it settle. */
  goto(url: string): Promise<void>;
  /** Evaluate a JavaScript expression in the page, awaited, its value returned. */
  evaluate<T>(expression: string): Promise<T>;
  /** The whole page as a PNG, at most `maxHeight` tall. */
  screenshot(maxHeight: number): Promise<Buffer>;
  close(): Promise<void>;
}

export interface CheckBrowser {
  /** What's driving it, said to a person: "Chrome", "the project's Playwright". */
  name: string;
  newPage(options: { width: number; height: number; init: string }): Promise<CheckPage>;
  close(): Promise<void>;
}

const LOAD_TIMEOUT = 30_000;
/** What a page is given to settle after it loads: the requests its scripts make. */
const SETTLE = 500;

/* ------------------------------------------------------------ the browser */

/** Where each system puts a Chromium browser, in the order they're tried. */
function chromeCandidates(): string[] {
  const env = process.env.ECHO_CHROME ?? process.env.CHROME_PATH;
  if (env) return [env];
  if (process.platform === "darwin") {
    return ["Google Chrome", "Chromium", "Microsoft Edge", "Brave Browser", "Google Chrome Canary"].map(
      (app) => `/Applications/${app}.app/Contents/MacOS/${app}`,
    );
  }
  if (process.platform === "win32") {
    const roots = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean) as string[];
    return roots.flatMap((root) => [join(root, "Google/Chrome/Application/chrome.exe"), join(root, "Microsoft/Edge/Application/msedge.exe"), join(root, "Chromium/Application/chrome.exe")]);
  }
  const names = ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "microsoft-edge"];
  return (process.env.PATH ?? "").split(delimiter).flatMap((dir) => names.map((name) => join(dir, name)));
}

/** The first Chromium browser this machine has, or undefined. */
export async function findChrome(): Promise<string | undefined> {
  for (const path of chromeCandidates()) {
    if (await access(path).then(() => true, () => false)) return path;
  }
  return undefined;
}

/**
 * A browser to check pages in: the machine's Chrome, else the project's
 * Playwright, else an error that says how to get one.
 */
export async function openBrowser(root: string): Promise<CheckBrowser> {
  const chrome = typeof WebSocket === "function" ? await findChrome() : undefined;
  let failed: BrowserError | undefined;
  if (chrome) {
    try {
      return await launchChrome(chrome);
    } catch (error) {
      if (!(error instanceof BrowserError)) throw error;
      failed = error;
    }
  }
  const playwright = await projectChromium(root);
  if (playwright) return launchPlaywright(playwright);
  // Chrome is there and won't start: most often a sandbox (an agent's) keeping it from it.
  if (failed) {
    throw new BrowserError(
      `${failed.message} A sandbox can keep a browser from starting; outside one, the same command renders the page. In Claude Code, the Stop gate runs these tests outside the sandbox when the agent stops.`,
    );
  }
  throw new BrowserError(
    "There's no browser to render the page in: no Chrome on this machine, and no Playwright in the project. Install Chrome, or add Playwright: `npm install -D playwright`, then `npx playwright install chromium`.",
  );
}

/* ----------------------------------------------- Chrome, over DevTools */

interface Message {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
  sessionId?: string;
}

/** One DevTools connection: requests by id, events by name. */
class DevTools {
  private next = 0;
  private waiting = new Map<number, { resolve(v: Record<string, unknown>): void; reject(e: Error): void }>();
  private listeners = new Set<(m: Message) => void>();

  constructor(private socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as Message;
      if (message.id !== undefined) {
        const call = this.waiting.get(message.id);
        this.waiting.delete(message.id);
        if (message.error) call?.reject(new BrowserError(message.error.message));
        else call?.resolve(message.result ?? {});
      } else for (const listen of this.listeners) listen(message);
    });
    socket.addEventListener("close", () => {
      for (const call of this.waiting.values()) call.reject(new BrowserError("Chrome closed the connection."));
      this.waiting.clear();
    });
  }

  static async open(url: string): Promise<DevTools> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new BrowserError("Couldn't connect to Chrome.")), { once: true });
    });
    return new DevTools(socket);
  }

  send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    const id = ++this.next;
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => this.waiting.set(id, { resolve: resolve as (v: Record<string, unknown>) => void, reject }));
  }

  /** The next `method` event in `sessionId`, or a timeout. */
  once(method: string, sessionId: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listen);
        reject(new BrowserError(`timed out after ${timeout / 1000}s`));
      }, timeout);
      const listen = (m: Message) => {
        if (m.method !== method || m.sessionId !== sessionId) return;
        clearTimeout(timer);
        this.listeners.delete(listen);
        resolve();
      };
      this.listeners.add(listen);
    });
  }

  close() {
    this.socket.close();
  }
}

async function launchChrome(path: string): Promise<CheckBrowser> {
  const profile = await mkdtemp(join(tmpdir(), "echo-chrome-"));
  const child: ChildProcess = spawn(
    path,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--hide-scrollbars",
      "--mute-audio",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const cleanUp = async () => {
    if (child.exitCode === null) child.kill();
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  };
  let devtools: DevTools;
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let said = "";
      const timer = setTimeout(() => reject(new BrowserError(`Chrome (${path}) didn't start within 20s.`)), 20_000);
      child.stderr!.on("data", (chunk) => {
        said += String(chunk);
        const found = /DevTools listening on (ws:\/\/\S+)/.exec(said);
        if (found) {
          clearTimeout(timer);
          resolve(found[1]!);
        }
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(new BrowserError(`Couldn't start Chrome (${path}): ${error.message}`));
      });
      child.on("exit", (code) => {
        clearTimeout(timer);
        reject(new BrowserError(`Chrome (${path}) quit before it started (exit ${code}).`));
      });
    });
    devtools = await DevTools.open(url);
  } catch (error) {
    await cleanUp();
    throw error;
  }

  return {
    name: "Chrome",
    async newPage({ width, height, init }) {
      const { targetId } = await devtools.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await devtools.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
      const send = <T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}) => devtools.send<T>(method, params, sessionId);
      await send("Page.enable");
      await send("Runtime.enable");
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
      await send("Page.addScriptToEvaluateOnNewDocument", { source: init });
      const evaluate = async <T>(expression: string): Promise<T> => {
        const { result, exceptionDetails } = await send<{ result: { value?: unknown }; exceptionDetails?: { exception?: { description?: string }; text: string } }>(
          "Runtime.evaluate",
          { expression, awaitPromise: true, returnByValue: true },
        );
        if (exceptionDetails) throw new BrowserError(exceptionDetails.exception?.description ?? exceptionDetails.text);
        return result.value as T;
      };
      return {
        async goto(url) {
          const loaded = devtools.once("Page.loadEventFired", sessionId, LOAD_TIMEOUT);
          const { errorText } = await send<{ errorText?: string }>("Page.navigate", { url });
          if (errorText) {
            loaded.catch(() => undefined);
            throw new BrowserError(errorText);
          }
          await loaded;
          await new Promise((done) => setTimeout(done, SETTLE));
        },
        evaluate,
        async screenshot(maxHeight) {
          const size = await evaluate<{ width: number; height: number }>(
            "({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })",
          );
          const clip = { x: 0, y: 0, width: Math.max(1, size.width), height: Math.max(1, Math.min(size.height, maxHeight)), scale: 1 };
          const { data } = await send<{ data: string }>("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
          return Buffer.from(data, "base64");
        },
        async close() {
          await devtools.send("Target.closeTarget", { targetId }).catch(() => undefined);
        },
      };
    },
    async close() {
      await devtools.send("Browser.close").catch(() => undefined);
      devtools.close();
      await cleanUp();
    },
  };
}

/* ---------------------------------------------------- the project's Playwright */

interface PlaywrightPage {
  addInitScript(script: { content: string }): Promise<void>;
  goto(url: string, options: { waitUntil: "load"; timeout: number }): Promise<unknown>;
  waitForLoadState(state: "networkidle", options: { timeout: number }): Promise<void>;
  evaluate<R>(expression: string): Promise<R>;
  screenshot(options: { fullPage: boolean; clip?: Clip }): Promise<Buffer>;
  close(): Promise<void>;
}
interface PlaywrightBrowser {
  newPage(options: { viewport: { width: number; height: number } }): Promise<PlaywrightPage>;
  close(): Promise<void>;
}
type Chromium = { launch(options: { headless: boolean }): Promise<PlaywrightBrowser> };

/** The project's Playwright, from wherever the project installed it, or undefined. */
async function projectChromium(root: string): Promise<Chromium | undefined> {
  const require = createRequire(join(root, "package.json"));
  for (const name of ["playwright", "@playwright/test", "playwright-core"]) {
    let path: string;
    try {
      path = require.resolve(name);
    } catch {
      continue;
    }
    const mod = (await import(pathToFileURL(path).href)) as { chromium?: Chromium; default?: { chromium?: Chromium } };
    const chromium = mod.chromium ?? mod.default?.chromium;
    if (chromium) return chromium;
  }
  return undefined;
}

/**
 * Playwright's own error for a page that won't load or run, as the Chrome
 * driver says it: a BrowserError, so it's that page's error and the other
 * pages are still tested.
 */
async function onPage<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    throw new BrowserError((error as Error).message.replace(/^page\.\w+: /, ""));
  }
}

async function launchPlaywright(chromium: Chromium): Promise<CheckBrowser> {
  let browser: PlaywrightBrowser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    const message = (error as Error).message;
    if (/Executable doesn't exist|playwright install/i.test(message)) {
      throw new BrowserError("The project's Playwright has no Chromium to run, and there's no Chrome on this machine. Install one: `npx playwright install chromium`.");
    }
    throw error;
  }
  return {
    name: "the project's Playwright",
    async newPage({ width, height, init }) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.addInitScript({ content: init });
      return {
        async goto(url) {
          await onPage(page.goto(url, { waitUntil: "load", timeout: LOAD_TIMEOUT }));
          // A page that keeps a connection open (a dev server's reload socket) never goes idle; it's fine to go on.
          await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
        },
        evaluate: (expression) => onPage(page.evaluate(expression)),
        async screenshot(maxHeight) {
          const size = await onPage(
            page.evaluate<{ width: number; height: number }>("({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })"),
          );
          return onPage(page.screenshot({ fullPage: true, clip: { x: 0, y: 0, width: Math.max(1, size.width), height: Math.max(1, Math.min(size.height, maxHeight)) } }));
        },
        close: () => page.close(),
      };
    },
    close: () => browser.close(),
  };
}
