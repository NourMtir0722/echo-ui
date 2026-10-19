/**
 * The video a supporter shares: nine seconds, square, silent. The whole island
 * floating in the night, turning; the camera glides down to their Echo, which
 * jumps; their card writes itself in (number, name, how they support, their
 * handles); and it ends on where to find the island and what an Echo costs.
 *
 * Made on their own device, frame by frame (the island steps 1/30 s at a
 * time, `advance`), so it's smooth on a slow laptop too, and encoded to an
 * H.264 MP4, which X, LinkedIn, Instagram and TikTok all take. Nothing is
 * uploaded.
 */
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, canEncodeVideo } from "mediabunny";
import { REGISTRY_HOMEPAGE } from "@registry/agent/guidance";
import { pageColour } from "@/components/home/echo3d/stage";
import { random } from "@/components/home/echo3d/pile";
import { DONATION_AMOUNTS } from "@/components/support/donation-links";
import { createIsland } from "./island-world";
import { LINK_MARK, handleOf } from "./links";
import { PLAN_LABEL, numberOf, type Person } from "./people";

const S = 1080;
const FPS = 30;
const SECONDS = 9;
/** When the camera sets off for them, when their card comes in, when the ask does. */
const FLY_AT = 2.4;
const CARD_AT = 4.1;
const ASK_AT = 5.9;

/** Whether this browser can make the video: WebCodecs, and an H.264 encoder at this size. */
export async function canMakeVideo(): Promise<boolean> {
  if (typeof VideoEncoder === "undefined") return false;
  try {
    return await canEncodeVideo("avc", { width: S, height: S, bitrate: QUALITY_HIGH });
  } catch {
    return false;
  }
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => 1 - (1 - clamp01(t)) ** 3;
const easeInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};

/** The page's colours and faces, read once: the video is drawn in what the page wears. */
function readLook() {
  const css = getComputedStyle(document.documentElement);
  const font = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const accent = pageColour("--echo-accent", "#3D8EF0");
  return {
    well: pageColour("--echo-well", "#0B1120"),
    seed: pageColour("--family-seed", accent),
    seedDeep: pageColour("--family-seed-deep", pageColour("--echo-accent-pressed", "#2A6BC4")),
    seedLight: pageColour("--family-seed-light", pageColour("--echo-accent-highlight", "#7FB2F5")),
    surface: pageColour("--echo-surface", "#1C2230"),
    text: pageColour("--echo-text", "#E9F0FA"),
    dim: pageColour("--echo-text-dim", "#9AA8BD"),
    capTop: pageColour("--echo-primary-cap-top", accent),
    capBase: pageColour("--echo-primary-cap-base", accent),
    capInk: pageColour("--echo-primary-cap-ink", "#FFFFFF"),
    display: font("--site-font-display", "ui-sans-serif, system-ui, sans-serif"),
    sans: getComputedStyle(document.body).fontFamily || "ui-sans-serif, system-ui, sans-serif",
    mono: font("--site-font-mono", "ui-monospace, monospace"),
  };
}
type Look = ReturnType<typeof readLook>;

/** The night the island floats in, as the page paints it: the brand's deep blue, a glow behind the island, stars. */
function skyOf(look: Look) {
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = look.well;
  g.fillRect(0, 0, S, S);
  const fall = g.createLinearGradient(0, 0, 0, S);
  fall.addColorStop(0, look.seedDeep);
  fall.addColorStop(1, "transparent");
  g.globalAlpha = 0.3;
  g.fillStyle = fall;
  g.fillRect(0, 0, S, S);
  const glow = g.createRadialGradient(S / 2, S * 0.45, 0, S / 2, S * 0.45, S * 0.6);
  glow.addColorStop(0, look.seed);
  glow.addColorStop(1, "transparent");
  g.globalAlpha = 0.26;
  g.fillStyle = glow;
  g.fillRect(0, 0, S, S);
  const rnd = random(23);
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 110; i++) {
    g.globalAlpha = 0.25 + rnd() * 0.5;
    g.beginPath();
    g.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.4, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  return c;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

/** Text set no wider than `max`: the size steps down until it fits. */
function fit(g: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, max: number) {
  let s = size;
  do {
    g.font = `${weight} ${s}px ${family}`;
    if (g.measureText(text).width <= max) break;
    s -= 2;
  } while (s > 20);
  return s;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((done, fail) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = fail;
    img.src = src;
  });
}

function overlay(g: CanvasRenderingContext2D, look: Look, person: Person, photo: HTMLImageElement | null, t: number) {
  const M = 64;
  // Where this is, the whole time.
  g.globalAlpha = ease(t / 0.6);
  g.fillStyle = look.text;
  g.textBaseline = "alphabetic";
  g.font = `800 52px ${look.display}`;
  g.fillText("Echo’s island", M, M + 44);
  g.fillStyle = look.dim;
  g.font = `500 28px ${look.sans}`;
  g.fillText(`${new URL(REGISTRY_HOMEPAGE).host}/supporters`, M, M + 90);

  // The ask, top right.
  const a = ease((t - ASK_AT) / 0.6);
  if (a > 0) {
    g.globalAlpha = a;
    const label = `Get your Echo · from $${DONATION_AMOUNTS[0]}`;
    g.font = `700 28px ${look.sans}`;
    const w = g.measureText(label).width + 56;
    const x = S - M - w;
    const y = M + 8 - (1 - a) * 12;
    const cap = g.createLinearGradient(0, y, 0, y + 64);
    cap.addColorStop(0, look.capTop);
    cap.addColorStop(1, look.capBase);
    roundRect(g, x, y, w, 64, 32);
    g.fillStyle = cap;
    g.fill();
    g.fillStyle = look.capInk;
    g.fillText(label, x + 28, y + 42);
  }

  // Their card, rising in at the foot.
  const c = ease((t - CARD_AT) / 0.7);
  if (c > 0) {
    g.globalAlpha = c;
    const h = person.no !== undefined ? 300 : 254;
    const x = M - 8;
    const w = S - 2 * x;
    const y = S - M - h + (1 - c) * 48;
    roundRect(g, x, y, w, h, 40);
    g.fillStyle = look.surface;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = person.founding ? look.seedLight : `${look.seedLight}55`;
    g.stroke();

    let left = x + 44;
    if (photo) {
      g.drawImage(photo, x + 14, y + (h - 200) / 2, 200, 200);
      left = x + 222;
    }
    const max = x + w - 44 - left;
    let line = y + 44;
    if (person.no !== undefined) {
      g.fillStyle = look.seedLight;
      g.font = `600 26px ${look.mono}`;
      g.fillText(numberOf(person).toUpperCase(), left, line + 22);
      if (person.founding) {
        g.font = `700 22px ${look.sans}`;
        const word = "FOUNDING";
        const bw = g.measureText(word).width + 32;
        const bx = left + g.measureText(numberOf(person).toUpperCase()).width + 70;
        roundRect(g, bx, line - 4, bw, 36, 18);
        g.fillStyle = look.capTop;
        g.fill();
        g.fillStyle = look.capInk;
        g.fillText(word, bx + 16, line + 21);
      }
      line += 46;
    }
    g.fillStyle = look.text;
    const size = fit(g, person.name, 800, 66, look.display, max);
    g.fillText(person.name, left, line + size * 0.82);
    line += size + 18;
    g.fillStyle = look.dim;
    g.font = `500 30px ${look.sans}`;
    g.fillText(PLAN_LABEL[person.plan] + (person.since ? `, since ${person.since}` : ""), left, line + 26);
    line += 58;

    // Their handles, each with its mark.
    let hx = left;
    g.font = `600 28px ${look.sans}`;
    for (const l of person.links) {
      const text = handleOf(l.kind, l.href);
      const mark = LINK_MARK[l.kind];
      const tw = g.measureText(text).width;
      if (hx + 40 + tw > x + w - 44) break;
      g.save();
      g.translate(hx, line - 4);
      g.scale(30 / 24, 30 / 24);
      const path = new Path2D(mark.d);
      if (mark.line) {
        g.strokeStyle = look.text;
        g.lineWidth = 1.6;
        g.stroke(path);
      } else {
        g.fillStyle = look.text;
        g.fill(path);
      }
      g.restore();
      g.fillStyle = look.text;
      g.fillText(text, hx + 40, line + 22);
      hx += 40 + tw + 36;
    }
  }
  g.globalAlpha = 1;
}

/**
 * Make the video of `person`'s place on the island. `photo` is their Echo's
 * photograph, if the page has made it, for the card.
 */
export async function makeVideo(
  person: Person,
  people: readonly Person[],
  { photo, onProgress, signal }: { photo?: string; onProgress?: (done: number) => void; signal?: AbortSignal } = {},
): Promise<Blob> {
  await document.fonts.ready;
  const look = readLook();
  const sky = skyOf(look);
  const image = photo ? await loadImage(photo).catch(() => null) : null;

  const scene = document.createElement("canvas");
  const world = await createIsland(scene, people, false, { size: { w: S, h: S }, manual: true, spin: 1.4, visit: "video" });
  world.startFacing(person.id, FLY_AT);
  const frame = document.createElement("canvas");
  frame.width = frame.height = S;
  const g = frame.getContext("2d")!;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(frame, { codec: "avc", bitrate: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: FPS });
  await output.start();

  const total = FPS * SECONDS;
  const dt = 1 / FPS;
  try {
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new DOMException("The video was stopped", "AbortError");
      const t = i * dt;
      if (i === Math.round(FLY_AT * FPS)) world.focus(person.id);
      // As the camera comes down to them, the view rises, so they stand above the card that comes in at the foot.
      world.lift(0.12 * easeInOut((t - FLY_AT) / (CARD_AT + 0.5 - FLY_AT)));
      world.advance(dt);
      g.drawImage(sky, 0, 0);
      g.drawImage(scene, 0, 0);
      overlay(g, look, person, image, t);
      await source.add(t, dt);
      onProgress?.((i + 1) / total);
    }
    await output.finalize();
  } catch (error) {
    await output.cancel();
    throw error;
  } finally {
    world.dispose();
  }
  return new Blob([output.target.buffer!], { type: "video/mp4" });
}

/** The file to share or save, named for whose place it is. */
export const videoFile = (person: Person, blob: Blob) => new File([blob], `echo-island-${person.id}.mp4`, { type: "video/mp4" });
