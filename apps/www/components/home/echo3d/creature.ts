/**
 * One 3D Echo: the body from Blender (scripts/echo-3d/model.py), dressed in
 * a marble with its face printed on (material.ts), and brought to life with
 * the flat creature's behaviours. It breathes, blinks, turns its whole body
 * toward the pointer and follows it with its eyes, and it can jump and spin
 * on the spot. A mood changes how: `sleep` droops its lids and slows its
 * breath, `busy` has it glancing about. Shapes change only with speed: it
 * gives a little on landing, never at rest.
 *
 * The owner places it every frame with a pose in pixels (see journey.ts);
 * everything else here is its own.
 */
import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  type BufferGeometry,
  type MeshPhysicalMaterial,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Marble } from "./palette";
import type { Skin } from "./skins";
import {
  LOOK,
  blendMarble,
  bodyMaterial,
  marbleColours,
  type BodyUniforms,
  type DrawingMap,
  type FaceUniforms,
  type MarbleColours,
} from "./material";

export type Mood = "idle" | "busy" | "sleep" | "done" | "error";

export interface EchoModel {
  body: BufferGeometry;
  /** Where the drawing lands on the body: what the face is printed by. */
  map: DrawingMap;
}

export async function loadModel(url: string): Promise<EchoModel> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const body = gltf.scene.getObjectByName("Body") as Mesh | undefined;
  const extras = body?.userData as { svg_centre?: [number, number]; svg_scale?: number } | undefined;
  if (!body || !extras?.svg_centre || !extras.svg_scale) throw new Error("echo.glb has no Body with its drawing map");
  return { body: body.geometry, map: { centre: extras.svg_centre, scale: extras.svg_scale } };
}

/** A soft round shadow, drawn once and shared. */
export function shadowTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,0.7)");
  r.addColorStop(0.5, "rgba(0,0,0,0.28)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/** Where a creature is, in viewport pixels, and how it's held there. */
export interface Placement {
  x: number;
  y: number;
  z?: number;
  size: number;
  spin?: number;
  lean?: number;
  /** Rolled about the axis facing you (the pile's tumbling). */
  roll?: number;
  air?: number;
  face?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const approach = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt));
const easeInOut = (p: number) => 0.5 - Math.cos(Math.PI * p) / 2;

/** How much bigger the ink line's body is than the body: its thickness. */
const OUTLINE = 1.07;

export class Creature3D {
  readonly root = new Group();
  readonly material: MeshPhysicalMaterial;
  private readonly uniforms: BodyUniforms;
  private readonly scaleMap: number;
  private readonly lean = new Group();
  private readonly turn = new Group();
  private readonly lift = new Group();
  private readonly breath = new Group();
  private readonly shadow: Mesh;
  /**
   * A drawn look's ink line round the silhouette: the body again, a little
   * bigger about its own centre, in the ink, under the body. Echo faces you
   * square, so its rounded edge is a sliver and the shader's edge ink alone
   * barely shows on it; the heap tumbles, and shows both.
   */
  private readonly outline: Mesh;
  private target: MarbleColours;

  mood: Mood = "idle";
  /** Follow the pointer with body and eyes. */
  watching = true;

  private time = Math.random() * 20;
  private yaw = 0;
  private pitch = 0;
  private lookX = 1;
  private lookY = 0;
  private lids = 1;
  private blinkIn = 1 + Math.random() * 3;
  private blink = -1;
  private hop = -1;
  private hopTurns = 0;
  private hopHeight = 0;
  private give = 0;
  private giveV = 0;
  private readonly breathRate = 0.8 + Math.random() * 0.4;

  constructor(model: EchoModel, marble: Marble, face: FaceUniforms, shadow: CanvasTexture) {
    const { material, uniforms } = bodyMaterial(marble, face);
    this.material = material;
    this.uniforms = uniforms;
    this.scaleMap = model.map.scale;
    this.target = marbleColours(marble);

    this.breath.add(new Mesh(model.body, material));
    model.body.computeBoundingSphere();
    const centre = model.body.boundingSphere!.center;
    // Drawn first, as a flat silhouette that writes no depth, so the body covers all of it but the ring.
    this.outline = new Mesh(model.body, new MeshBasicMaterial({ color: 0x050505, depthWrite: false }));
    this.outline.renderOrder = -0.5;
    this.outline.scale.setScalar(OUTLINE);
    this.outline.position.copy(centre).multiplyScalar(1 - OUTLINE);
    this.outline.visible = false;
    this.breath.add(this.outline);
    this.lift.add(this.breath);
    this.turn.add(this.lift);
    this.lean.add(this.turn);

    this.shadow = new Mesh(
      new PlaneGeometry(2.3, 0.5),
      new MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false, side: DoubleSide, opacity: 0 }),
    );
    this.shadow.position.set(0, -0.98, -0.45);
    this.shadow.renderOrder = -1;
    this.root.add(this.shadow, this.lean);
  }

  /** Wear a skin (skins.ts): its hues, its rim and glow, its speckles and its coat. */
  setSkin(skin: Skin) {
    const u = this.uniforms;
    u.uSkin.value = 1;
    u.uSkinA.value.set(skin.a);
    u.uSkinB.value.set(skin.b);
    u.uSkinC.value.set(skin.c);
    u.uRim.value.set(skin.rim);
    u.uRimAmt.value = skin.rimAmt;
    u.uGlow.value = skin.glow;
    u.uSpeck.value = skin.speck;
    this.material.roughness = skin.roughness;
    this.material.clearcoatRoughness = skin.coatRoughness;
    this.material.iridescence = skin.iridescence;
  }

  /** Draw an ink line round the silhouette (a drawn look), or none. */
  setOutline(ink: string | null) {
    this.uniforms.uInkAmt.value = ink ? 1 : 0;
    if (ink) this.uniforms.uInk.value.set(ink);
    this.outline.visible = ink !== null;
    if (ink) (this.outline.material as MeshBasicMaterial).color.set(ink);
    // Drawn, Echo is the plain marble in the paper, like the heap, with no skin, sheen or coat:
    // at the edge they'd wash the line out, and paper has neither.
    if (ink) this.uniforms.uSkin.value = 0;
    this.material.sheen = ink ? 0 : 0.6;
    this.material.clearcoat = ink ? 0 : 0.9;
  }

  /** Change colour. It washes over the body in about half a second. */
  setMarble(marble: Marble) {
    this.target = marbleColours(marble);
  }

  /** Jump on the spot, turning `turns` whole turns on the way (negative: the other way). */
  jump(turns = 1, height = 0.8) {
    if (this.hop >= 0 && this.hop < 0.5) return;
    this.hop = 0;
    this.hopTurns = turns;
    this.hopHeight = height;
  }

  /** Landed at `speed` (0..1): the only time its shape gives. */
  land(speed: number) {
    this.giveV += clamp(speed, 0, 1) * 5;
  }

  get visible() {
    return this.root.visible;
  }
  set visible(v: boolean) {
    this.root.visible = v;
  }

  update(dt: number, at: Placement, pointer: { x: number; y: number } | null, still: boolean) {
    if (!still) this.time += dt;
    blendMarble(this.uniforms, this.material.sheenColor, this.target, 1 - Math.exp(-dt * 5));
    this.uniforms.uTime.value = still ? 0 : this.time;

    this.root.position.set(at.x, -at.y, at.z ?? 0);
    this.root.scale.setScalar(at.size / 2);

    // Where it looks: at the pointer when it's watching, or about itself.
    let yaw = 0;
    let pitch = 0;
    let lookX = 1;
    let lookY = 0;
    if (!still) {
      if (this.mood === "sleep") {
        lookX = 0.3;
        lookY = -0.5;
      } else if (this.mood === "busy") {
        lookX = Math.sin(this.time * 1.9) > 0 ? 1 : -0.6;
        lookY = -0.3;
        yaw = Math.sin(this.time * 1.9) * 0.18;
      } else if (pointer && this.watching) {
        const dx = pointer.x - at.x;
        const dy = pointer.y - at.y;
        yaw = clamp(dx / 800, -1, 1) * 0.55;
        pitch = clamp(dy / 800, -1, 1) * 0.32;
        lookX = clamp(dx / 320, -1, 1);
        lookY = clamp(-dy / 320, -1, 1);
      } else {
        // Nobody to watch: it glances about now and then.
        lookX = Math.sin(this.time * 0.37) > -0.3 ? 1 : -0.4;
        lookY = Math.sin(this.time * 0.23) * 0.3;
      }
    }
    this.yaw = approach(this.yaw, yaw, 5, dt);
    this.pitch = approach(this.pitch, pitch, 5, dt);
    this.lookX = approach(this.lookX, lookX, 12, dt);
    this.lookY = approach(this.lookY, lookY, 12, dt);

    // A jump: up and down on an arc, turning as it goes.
    let hopY = 0;
    let hopSpin = 0;
    if (this.hop >= 0) {
      this.hop += dt / 0.68;
      const p = Math.min(1, this.hop);
      hopY = Math.sin(Math.PI * p) * this.hopHeight;
      hopSpin = easeInOut(p) * Math.PI * 2 * this.hopTurns;
      if (p >= 1) {
        this.hop = -1;
        this.land(0.7);
      }
    }
    this.lift.position.y = hopY;
    this.lean.rotation.z = -(at.lean ?? 0) + (at.roll ?? 0);
    this.turn.rotation.y = (at.spin ?? 0) + (at.face ?? 0) + this.yaw + hopSpin;
    this.turn.rotation.x = this.pitch;

    // Breath, and the give of a landing (a spring, settling in a few tenths of a second).
    this.giveV += (-this.give * 140 - this.giveV * 11) * dt;
    this.give += this.giveV * dt;
    const period = this.mood === "sleep" ? 5.5 : 3.6;
    const breath = still ? 0 : Math.sin((this.time * Math.PI * 2 * this.breathRate) / period) * (this.mood === "sleep" ? 0.03 : 0.018);
    const squash = clamp(this.give, -0.2, 0.2) * 0.35;
    this.breath.scale.set(1 - breath * 0.5 + squash * 0.5, 1 + breath - squash, 1 - breath * 0.5 + squash * 0.5);
    this.breath.position.y = -(1 - this.breath.scale.y);

    // Lids: half shut asleep, and a blink every few seconds.
    const open = this.mood === "sleep" ? 0.2 : 1;
    this.lids = approach(this.lids, open, 3, dt);
    let blink = 1;
    if (!still) {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) {
        this.blink = 0;
        this.blinkIn = this.mood === "sleep" ? 4 + Math.random() * 5 : 2.6 + Math.random() * 4;
      }
      if (this.blink >= 0) {
        this.blink += dt;
        const b = this.blink;
        blink = b < 0.07 ? 1 - b / 0.07 : b < 0.19 ? (b - 0.07) / 0.12 : 1;
        if (b >= 0.19) this.blink = -1;
      }
    }
    this.uniforms.uLids.value = Math.max(0.06, this.lids * blink);

    // The pupils slide across the whites: all the way right is the drawing as it is.
    const sx = LOOK.left + ((LOOK.right - LOOK.left) * (this.lookX + 1)) / 2;
    const sy = this.lookY >= 0 ? LOOK.up * this.lookY : LOOK.down * -this.lookY;
    this.uniforms.uLook.value.set(sx * this.scaleMap, -sy * this.scaleMap);

    const air = clamp((at.air ?? 0) + hopY * 1.2, 0, 1);
    (this.shadow.material as MeshBasicMaterial).opacity = 0.55 * (1 - air);
  }

  dispose() {
    this.material.dispose();
    (this.outline.material as MeshBasicMaterial).dispose();
    (this.shadow.material as MeshBasicMaterial).dispose();
    this.shadow.geometry.dispose();
  }
}
