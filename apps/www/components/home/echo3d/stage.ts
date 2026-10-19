/**
 * The stage: one WebGL canvas over the whole homepage, where Echo travels
 * down the page and its crowd piles up at the foot of it.
 *
 * The camera is set so that a pixel on the page is a unit in the scene: at
 * depth 0 a creature placed at the page coordinates of a perch is drawn
 * exactly on it, and anything nearer or further gets a little perspective.
 * The canvas is fixed to the window and redrawn every frame after the page
 * has scrolled (frame.ts), so what's drawn stays glued to what's on the page.
 *
 * Echo follows journey.ts: perch to perch, riding the margin in between,
 * with the scroll. In the accessibility section it stands beside whatever
 * has keyboard focus. At the foot it drops into the pile with its crowd,
 * which fell in when the foot of the page first came into view (pile.ts).
 * The pointer is watched by everyone; press on Echo, or on one of the crowd,
 * and it jumps.
 *
 * It lights the scene from the page: the key light is white from the top
 * left, as it is on every cap, and the rim light behind is the seed.
 */
import {
  DirectionalLight,
  HemisphereLight,
  NeutralToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SoundRecipe } from "echo-ui-core/sound";
import { Creature3D, loadModel, shadowTexture, type Mood, type Placement } from "./creature";
import { eyeMask, faceUniforms } from "./material";
import { crowdMarbles, echoMarble, inkMarbles } from "./palette";
import { FLOWER, onPerch, place, placeStill, type Box, type Pose, type Stop } from "./journey";
import { Pile, random } from "./pile";
import { glaze, type FamilyColours } from "./skins";
import { onFrame } from "../frame";

/** Where Echo is drawn this frame, viewport px, and whether it's drawn at all. */
export interface DrawnPose {
  x: number;
  y: number;
  size: number;
  visible: boolean;
}

export interface StageOptions {
  canvas: HTMLCanvasElement;
  /** The model's URL. */
  model: string;
  reduced: boolean;
  /** The event that cheers Echo on (a command copied, say). */
  cheerEvent: string;
  /** Echo has taken over from the drawing at home (true), or handed it back. */
  onAway: (away: boolean) => void;
  /**
   * Echo is sitting at home (true) or out on the page. Given, the page draws
   * Echo at home itself (the hero device's screen), so the 3D Echo steps out
   * of sight there and appears as it leaves.
   */
  onHome?: (home: boolean) => void;
  play?: (sound: SoundRecipe) => void;
  /** Told where Echo is drawn, every frame it's drawn (the light it carries follows it). */
  onPose?: (pose: DrawnPose) => void;
  /** Echo's supporters (supporters.ts): some of the heap are them, and say their names when pointed at or tapped. */
  supporters?: readonly { id: string; name: string }[];
}

export interface Stage {
  /** The seed changed: read the page's colours again. */
  relight(): void;
  destroy(): void;
}

const FOV = 26;
/** A press on something you can use is never a press on a creature behind it. */
const USABLE = "a, button, input, select, textarea, label, summary, [role], [tabindex]";
const BOOP: SoundRecipe = { wave: "sine", freq: [440, 660], decay: 0.12, gain: 0.09, bend: 260 };

/** A colour the page resolved a custom property to, as #rrggbb. */
export function pageColour(name: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${name}, ${fallback})`;
  probe.style.display = "none";
  document.body.append(probe);
  const css = getComputedStyle(probe).color;
  probe.remove();
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  // A colour the canvas can't read would leave the last one standing: the fallback, said once.
  g.fillStyle = CSS.supports("color", css) ? css : fallback;
  g.fillRect(0, 0, 1, 1);
  const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
  return `#${[r, gr, b].map((v) => v!.toString(16).padStart(2, "0")).join("")}`;
}

const box = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A critically damped spring, one step (stable at any frame time). */
function follow(x: number, v: number, to: number, w: number, dt: number): [number, number] {
  const f = 1 + 2 * dt * w;
  const hoo = dt * w * w;
  const det = f + dt * hoo;
  return [(f * x + dt * v + dt * hoo * to) / det, (v + hoo * (to - x)) / det];
}

export async function createStage(opts: StageOptions): Promise<Stage> {
  const { canvas, reduced } = opts;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;
  room.dispose();
  pmrem.dispose();

  const sky = new HemisphereLight(0xffffff, 0x1c1628, 0.9);
  const key = new DirectionalLight(0xffffff, 2.1);
  key.position.set(-0.55, 1, 0.75);
  const rim = new DirectionalLight(0xffffff, 3);
  rim.position.set(0.7, 0.35, -1);
  scene.add(sky, key, rim);

  const camera = new PerspectiveCamera(FOV, 1, 1, 10000);
  let vw = 0;
  let vh = 0;
  const resize = () => {
    vw = canvas.clientWidth;
    vh = canvas.clientHeight;
    renderer.setSize(vw, vh, false);
    const dist = vh / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.aspect = vw / vh;
    camera.near = Math.max(1, dist - 2000);
    camera.far = dist + 2000;
    camera.position.set(vw / 2, -vh / 2, dist);
    camera.lookAt(vw / 2, -vh / 2, 0);
    camera.updateProjectionMatrix();
  };
  resize();

  const model = await loadModel(opts.model);
  const shadow = shadowTexture();
  let colours = readColours();
  const mask = eyeMask();
  const face = faceUniforms(model.map, mask, colours.text, colours.seam);
  const guide = new Creature3D(model, echoMarble(colours.accent, colours.highlight, colours.pressed), face, shadow);
  scene.add(guide.root);
  /** The site wears a drawn look (theme-boot.ts): Echo is drawn like the page, in its ink. */
  const isDrawn = () => document.documentElement.hasAttribute("data-drawn");

  /**
   * Echo, and the heap at the foot of the page, in the page's colours. On a
   * drawn look in one ink there's no hue to make a skin from: Echo is the
   * paper with an ink line round it, its eyes printed in the ink, and the
   * heap runs from the paper to the ink.
   */
  function dress() {
    const drawn = isDrawn();
    if (drawn) {
      guide.setMarble(inkMarbles(colours.text, colours.surface, 1)[0]!);
      face.uWhite.value.set(colours.surface);
      face.uPupil.value.set(colours.text);
      // A drawing has no light behind it: the rim would wash its ink line out.
      rim.intensity = 0;
    } else {
      guide.setMarble(echoMarble(colours.accent, colours.highlight, colours.pressed));
      guide.setSkin(glaze(readFamily()));
      face.uWhite.value.set(colours.text);
      face.uPupil.value.set(colours.seam);
      rim.color.set(colours.accent);
      rim.intensity = 3;
    }
    guide.setOutline(drawn ? colours.text : null);
    crowd.forEach((c, i) => wear(c, i, crowd.length));
  }

  /** The crowd's marbles, `count` of them, in the page's colours. */
  function marblesFor(count: number) {
    return isDrawn() ? inkMarbles(colours.text, colours.surface, count) : crowdMarbles(colours.accent, count);
  }

  /** One of the crowd in the page's colours: its marble, and its line on a drawn look. */
  function wear(c: Creature3D, i: number, count: number) {
    c.setMarble(marblesFor(count)[i]!);
    c.setOutline(isDrawn() ? colours.text : null);
  }

  /** The page's colour family (family.ts), for the skin. */
  function readFamily(): FamilyColours {
    return {
      seed: pageColour("--family-seed", colours.accent),
      seedLight: pageColour("--family-seed-light", colours.highlight),
      seedDeep: pageColour("--family-seed-deep", colours.pressed),
      next: pageColour("--family-next", colours.highlight),
      prev: pageColour("--family-prev", colours.pressed),
      spark: pageColour("--family-spark", colours.highlight),
    };
  }

  function readColours() {
    return {
      accent: pageColour("--echo-accent", "#8B6FE8"),
      highlight: pageColour("--echo-accent-highlight", "#B5A2F2"),
      pressed: pageColour("--echo-accent-pressed", "#6A4FC9"),
      text: pageColour("--echo-text", "#EFEBFA"),
      seam: pageColour("--echo-seam", "#131216"),
      surface: pageColour("--echo-surface", "#232130"),
    };
  }

  // --- where the perches are --------------------------------------------------

  let stops: HTMLElement[] = [];
  let sections: HTMLElement[] = [];
  /** The screens that can call Echo in: the keychain's, and any on the page (`data-echo-dock`). */
  let docks: HTMLElement[] = [];
  /*
   * The perches are looked up again whenever the page's elements change, not
   * kept for good: a section can move its perch (the row that's awake, a
   * panel that opened), and a kept element would be one React has already
   * taken off the page. Looking them up every frame instead cost the most of
   * anything on the journey's long page.
   */
  let stale = true;
  const collect = () => {
    if (!stale) return;
    stale = false;
    sections = [...document.querySelectorAll<HTMLElement>("[data-guide-section]")];
    const found = sections.map((s) => s.querySelector<HTMLElement>("[data-guide-stop]"));
    sections = sections.filter((_, i) => found[i]);
    stops = found.filter((s): s is HTMLElement => !!s);
    docks = [...document.querySelectorAll<HTMLElement>("[data-echo-dock]")];
  };
  const restale = () => {
    stale = true;
  };
  const watch = new MutationObserver(restale);
  watch.observe(document.body, { childList: true, subtree: true });
  /** The site's bar along the top of the window: nothing is drawn under it. */
  const bar = document.querySelector<HTMLElement>(".echo-shell__rail");
  collect();
  const content = document.querySelector<HTMLElement>(".home");
  /** The empty margin beside the page's text: the content box's edge, padding included. */
  const margin = () => {
    if (!content) return 0;
    return Math.max(0, content.getBoundingClientRect().left + parseFloat(getComputedStyle(content).paddingLeft));
  };

  // --- the pointer ------------------------------------------------------------

  let pointer: { x: number; y: number } | null = null;
  let pointerV = { x: 0, y: 0 };
  let pointerAt = 0;
  const onMove = (e: PointerEvent) => {
    const now = performance.now();
    if (pointer) {
      const dt = Math.max(8, now - pointerAt) / 1000;
      pointerV = { x: (e.clientX - pointer.x) / dt, y: (e.clientY - pointer.y) / dt };
    }
    pointer = { x: e.clientX, y: e.clientY };
    pointerAt = now;
  };
  const onLeave = () => {
    pointer = null;
  };

  // --- the pile ---------------------------------------------------------------

  const band = document.querySelector<HTMLElement>("[data-echo-pile]");
  let pile: Pile | null = null;
  let crowd: Creature3D[] = [];
  /** Which of the crowd is a supporter: their name, by the crowd's index. */
  let named: (string | null)[] = [];
  /** A supporter's name, over their creature while it's pointed at, or for a moment after a tap. */
  const tag = document.createElement("span");
  tag.className = "echo3d-tag";
  tag.setAttribute("aria-hidden", "true");
  document.body.append(tag);
  let tapped: { i: number; until: number } | null = null;
  let dropped = false;
  /** Echo's own ball in the pile, while it's in there. */
  let mine = -1;

  const buildPile = (width: number) => {
    // Big and many: a heap two or three deep, whatever the width.
    const base = clamp(width * 0.105, 78, 168);
    const count = clamp(Math.round((width / base) * 1.9), 6, 20);
    const rnd = random(3);
    const sizes = Array.from({ length: count }, () => base * (0.72 + rnd() * 0.56));
    pile = new Pile(
      sizes.map((s) => s / 2),
      width,
      5,
    );
    const marbles = marblesFor(count);
    crowd = sizes.map((_, i) => {
      const c = new Creature3D(model, marbles[i]!, face, shadow);
      c.mood = (["idle", "sleep", "idle", "busy", "idle"] as Mood[])[i % 5]!;
      c.visible = false;
      wear(c, i, count);
      scene.add(c.root);
      return c;
    });
    // As many of the heap as there are supporters are them, each in a place picked at random for this visit.
    const who = [...(opts.supporters ?? [])].sort(() => Math.random() - 0.5).slice(0, count);
    const places = sizes.map((_, i) => i).sort(() => Math.random() - 0.5);
    named = sizes.map(() => null);
    who.forEach((s, k) => (named[places[k]!] = s.name));
  };

  dress();

  // --- Echo -------------------------------------------------------------------

  const shown: Pose & { vx: number; vy: number; vs: number } = { ...onPerch({ left: -999, top: -999, width: 0, height: 0 }), vx: 0, vy: 0, vs: 0 };
  let started = false;
  let away = false;
  let home: boolean | null = null;
  /** Whether the last frame drawn had anything on it. */
  let drewSomething = true;
  let last = performance.now();
  let settled = "";
  /** The perch Echo was pressing a button from last frame (journey/DemoCard.tsx), so it gives once as it lands. */
  let pressing: HTMLElement | null = null;
  /** The screen Echo is in, held there. */
  let heldBy: HTMLElement | null = null;
  /** The last landing a screen reported (`data-land`). */
  let landed: string | undefined;
  /** When each screen calling Echo began to, so the latest call wins. */
  const calledAt = new Map<HTMLElement, number>();

  /** A focused control in a follow-focus section: Echo stands beside its panel, level with it. */
  const besideFocus = (stop: HTMLElement): Pose | null => {
    if (stop.dataset.guideFollow !== "focus") return null;
    const a = document.activeElement;
    if (!(a instanceof HTMLElement) || !a.matches(":focus-visible")) return null;
    const rail = a.closest<HTMLElement>("[data-guide-rail]");
    const section = stop.closest("[data-guide-section]");
    if (!rail || !section?.contains(rail)) return null;
    const w = stop.getBoundingClientRect().width;
    const r = rail.getBoundingClientRect();
    if (r.left < w + 16) return null;
    const f = a.getBoundingClientRect();
    return { x: r.left - w / 2 - 8, y: f.top + f.height / 2, size: w * FLOWER, spin: 0, lean: 0, air: 0, face: 0.35 };
  };

  const moodOf = (i: number | null): Mood => (i === null ? "idle" : ((stops[i]?.dataset.guideMood as Mood | undefined) ?? "idle"));

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (canvas.clientWidth !== vw || canvas.clientHeight !== vh) resize();
    collect();
    if (stops.length === 0) return;

    const scroll = window.scrollY;
    const view = {
      scroll,
      maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      vw,
      vh,
      gutter: margin(),
      top: bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0,
    };
    const way: Stop[] = stops.map((stop, i) => ({ perch: box(stop), section: box(sections[i]!) }));
    const at = reduced ? placeStill(way, view) : place(way, view);
    let target: Pose = at.pose;
    const perchEl = at.perch === null ? null : stops[at.perch]!;
    if (perchEl) target = besideFocus(perchEl) ?? target;
    guide.mood = moodOf(at.perch);
    // A perch that travels (How it works' road) says how Echo turns on it, in radians:
    // a roll round a bend, a lean as it hops. Only while Echo is sitting on it.
    let perchRoll = 0;
    if (perchEl && at.seated) {
      perchRoll = Number(perchEl.dataset.guideRoll) || 0;
      const lean = Number(perchEl.dataset.guideLean) || 0;
      if (lean) target = { ...target, lean: target.lean + lean };
    }
    // Landing on a button to press it: its weight goes into the cap, and it gives, once.
    const onCap = perchEl && at.seated && perchEl.dataset.guidePress === "1" ? perchEl : null;
    if (onCap && onCap !== pressing && !reduced) guide.land(0.85);
    pressing = onCap;

    // The pile: dropped the first time the foot of the page comes into view.
    const b = band ? band.getBoundingClientRect() : null;
    const pileNear = !!b && b.top < vh + 300 && b.bottom > -300;
    if (b && pileNear && !pile) buildPile(b.width);
    if (pile && b) {
      if (pile.width !== b.width) pile.resize(b.width);
      if (!dropped && b.top < vh * 0.92) {
        dropped = true;
        pile.drop(b.height * 0.7);
        if (reduced) pile.settle();
      }
      // Echo joins its crowd on the last perch, and leaves it when you scroll back up.
      const inPile = at.perch === stops.length - 1 && at.seated && dropped && perchEl?.hasAttribute("data-guide-pile");
      if (inPile && mine < 0) {
        mine = pile.add({
          x: clamp(shown.x - b.left, 1, b.width - 1),
          y: b.bottom - shown.y,
          z: pile.depth,
          vx: 0,
          vy: 0,
          vz: 0,
          r: target.size / 2,
          roll: 0,
          spin: 0,
        });
      } else if (!inPile && mine >= 0) {
        pile.remove(mine);
        mine = -1;
      }
      if (pointer && !reduced) {
        const px = pointer.x - b.left;
        const py = b.bottom - pointer.y;
        if (py > -80 && py < b.height + 200) pile.push(px, py, 34, pointerV.x, -pointerV.y);
      }
      // Under reduced motion nothing falls: whatever changed, the heap is simply settled again.
      if (reduced) {
        if (!pile.still) pile.settle();
      } else if (pileNear || mine >= 0) pile.step(dt);
      pointerV = { x: pointerV.x * 0.8, y: pointerV.y * 0.8 };

      pile.balls.forEach((ball, i) => {
        if (i === mine) return;
        const c = crowd[i]!;
        c.visible = pileNear && !ball.waiting;
        if (!c.visible) return;
        const placed: Placement = {
          x: b.left + ball.x,
          y: b.bottom - ball.y,
          z: ball.z,
          size: ball.r * 2,
          roll: ball.roll,
          air: clamp((ball.y - ball.r) / 60, 0, 1),
        };
        c.update(dt, placed, pointer, reduced);
      });
      // The supporter pointed at, or tapped a moment ago, says who they are.
      let say = tapped && now < tapped.until ? tapped.i : -1;
      const p = pointer;
      if (say < 0 && p && pileNear) {
        pile.balls.forEach((ball, i) => {
          if (i !== mine && named[i] && !ball.waiting && Math.hypot(p.x - (b.left + ball.x), p.y - (b.bottom - ball.y)) < ball.r) say = i;
        });
      }
      const ball = say >= 0 && named[say] ? pile.balls[say] : undefined;
      if (ball && pileNear) {
        tag.textContent = named[say]!;
        tag.style.transform = `translate(${b.left + ball.x}px, ${b.bottom - ball.y - ball.r - 6}px) translate(-50%, -100%)`;
        tag.dataset.on = "";
      } else delete tag.dataset.on;
      if (mine >= 0) {
        const ball = pile.balls[mine]!;
        target = { x: b.left + ball.x, y: b.bottom - ball.y, size: ball.r * 2, spin: 0, lean: 0, air: clamp((ball.y - ball.r) / 60, 0, 1), face: 0 };
        guide.mood = "idle";
      }
    }

    // Called into a screen: home to the keychain (Keychain.tsx), or a screen on the page that calls it
    // in. Echo flies into it, and the screen takes over. `data-echo-dock-fill` is how much of the
    // screen's box Echo's flower fills there (the keychain's 0.9 by default).
    // Two screens calling at once (Echo's in a screen on the page, and you call it home): the latest call wins.
    let dock: HTMLElement | null = null;
    for (const d of docks) {
      const calling = d.isConnected && d.hasAttribute("data-called") && d.getClientRects().length > 0;
      if (!calling) calledAt.delete(d);
      else if (!calledAt.has(d)) calledAt.set(d, now);
      if (calling && mine < 0 && (!dock || calledAt.get(d)! >= calledAt.get(dock)!)) dock = d;
    }
    const dockScreen = dock?.querySelector<HTMLElement>("[data-echo-dock-screen]");
    const called = !!dock && !!dockScreen;
    if (called) {
      const r = dockScreen!.getBoundingClientRect();
      const fill = Number(dock!.dataset.echoDockFill) || 0.9;
      // A screen that moves Echo about inside it says how it's posed there too (a ride, a jump).
      const pose = dockScreen!.dataset;
      target = {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        size: r.width * fill,
        spin: Number(pose.spin) || 0,
        lean: Number(pose.lean) || 0,
        air: Number(pose.air) || 0,
        face: Number(pose.face) || 0,
      };
      // It says when Echo lands on something there (a count that goes up): its weight goes into it, once.
      if (pose.land && pose.land !== landed) {
        if (landed !== undefined && !reduced) guide.land(0.8);
        landed = pose.land;
      }
    }

    // Echo eases after its pose, so a change of plan (focus, the pile) is a glide, not a jump.
    if (!started || reduced || (called && dock === heldBy)) {
      // Once in a screen, it's held there exactly, however the screen moves (a page scrolling under it).
      Object.assign(shown, target, { vx: 0, vy: 0, vs: 0 });
    } else {
      [shown.x, shown.vx] = follow(shown.x, shown.vx, target.x, 26, dt);
      [shown.y, shown.vy] = follow(shown.y, shown.vy, target.y, 26, dt);
      [shown.size, shown.vs] = follow(shown.size, shown.vs, target.size, 20, dt);
      shown.spin = target.spin;
      shown.lean = target.lean;
      shown.air = target.air;
      shown.face = target.face;
    }
    const roll = mine >= 0 && pile ? pile.balls[mine]!.roll : perchRoll;
    guide.update(dt, { ...shown, z: mine >= 0 && pile ? pile.balls[mine]!.z : 0, roll }, pointer, reduced);
    const docked = called && Math.hypot(shown.x - target.x, shown.y - target.y) < 4 && Math.abs(shown.size - target.size) < 4;
    heldBy = docked ? dock : null;
    for (const d of docks) {
      const here = docked && d === dock;
      if (d.hasAttribute("data-docked") !== here) d.toggleAttribute("data-docked", here);
    }
    // In a screen, the screen draws Echo, unless it's a stage Echo stays on in 3D (`data-echo-dock-stay`).
    const hidden = docked && !dock!.hasAttribute("data-echo-dock-stay");
    guide.visible = !hidden;
    if (opts.onHome) {
      const atHome = at.perch === 0 && at.seated && !called;
      guide.visible = !atHome && !hidden;
      if (atHome !== home) {
        home = atHome;
        opts.onHome(atHome);
      }
    }

    opts.onPose?.({ x: shown.x, y: shown.y, size: shown.size, visible: guide.visible && started });

    // Nothing on the stage (Echo at home or in the keychain, the heap far off): once the canvas
    // has been cleared, leave it alone. A canvas that changes every frame makes the browser hand the
    // whole page to the compositor every frame, which cost a quarter of the main thread.
    const showing = guide.visible || crowd.some((c) => c.visible);
    if (showing || drewSomething || !started) renderer.render(scene, camera);
    drewSomething = showing;

    // Drawn once: now the drawing at home can make way for it.
    if (!started) {
      started = true;
      away = true;
      canvas.dataset.echo = "ready";
      opts.onAway(true);
    }
    // Where it's drawn, for anything that has to know (the tests): its centre and size, in pixels.
    const drawn = `${Math.round(shown.x)},${Math.round(shown.y)},${Math.round(shown.size)}`;
    if (drawn !== canvas.dataset.at) canvas.dataset.at = drawn;
    const state = `${at.perch ?? "travelling"}|${mine >= 0 ? "pile" : ""}|${dropped ? (pile?.still ? "still" : "falling") : "waiting"}`;
    if (state !== settled) {
      settled = state;
      canvas.dataset.perch = at.perch === null ? "" : String(at.perch);
      canvas.dataset.pile = dropped ? (pile?.still ? "still" : "falling") : "waiting";
      canvas.dataset.inPile = mine >= 0 ? "true" : "false";
    }
  };

  // --- presses ----------------------------------------------------------------

  const hop = (c: Creature3D) => {
    c.jump(Math.random() < 0.5 ? 1 : -1, 0.75);
    opts.play?.(BOOP);
  };
  const onDown = (e: PointerEvent) => {
    if (!(e.target instanceof Element) || e.target.closest(USABLE)) return;
    // Echo itself.
    if (mine < 0 && Math.hypot(e.clientX - shown.x, e.clientY - shown.y) < shown.size * 0.55) {
      hop(guide);
      return;
    }
    // One of the crowd, or Echo among them.
    if (pile && band && !reduced) {
      const b = band.getBoundingClientRect();
      const i = pile.poke(e.clientX - b.left, b.bottom - e.clientY, 24);
      if (i >= 0) opts.play?.(BOOP);
      if (i >= 0 && named[i]) tapped = { i, until: performance.now() + 2500 };
    }
  };
  // Press something in the section Echo's sitting in, and it's pleased.
  const onClick = (e: MouseEvent) => {
    if (reduced || !(e.target instanceof Element)) return;
    const pressed = e.target.closest("button, a[href]");
    const perch = Number(canvas.dataset.perch);
    const section = Number.isFinite(perch) && canvas.dataset.perch !== "" ? stops[perch]?.closest("[data-guide-section]") : null;
    if (pressed && section?.contains(pressed)) guide.jump(1, 0.55);
  };
  const onCheer = () => {
    if (!reduced) guide.jump(2, 0.9);
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("pointerdown", onDown, { passive: true });
  document.addEventListener("click", onClick);
  window.addEventListener(opts.cheerEvent, onCheer);
  window.addEventListener("resize", restale);
  const stop = onFrame(frame);

  return {
    relight() {
      colours = readColours();
      dress();
    },
    destroy() {
      stop();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("click", onClick);
      window.removeEventListener(opts.cheerEvent, onCheer);
      window.removeEventListener("resize", restale);
      watch.disconnect();
      tag.remove();
      for (const c of [guide, ...crowd]) c.dispose();
      mask.dispose();
      shadow.dispose();
      model.body.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      if (away) opts.onAway(false);
    },
  };
}
