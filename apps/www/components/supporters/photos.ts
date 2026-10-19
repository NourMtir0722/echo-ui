/**
 * Every Echo on the island, photographed once in 3D: the landing's own Echo
 * (the Blender body, its face printed on, its coat), lit the way the page
 * lights it, and kept as a picture, for the name tags and the cards. Eighty
 * live 3D scenes would be eighty WebGL contexts; one studio is one.
 */
import {
  DirectionalLight,
  HemisphereLight,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Creature3D, loadModel, shadowTexture } from "@/components/home/echo3d/creature";
import { eyeMask, faceUniforms } from "@/components/home/echo3d/material";
import { echoMarble } from "@/components/home/echo3d/palette";
import { glaze, type Skin } from "@/components/home/echo3d/skins";
import { pageColour } from "@/components/home/echo3d/stage";
import { random } from "@/components/home/echo3d/pile";
import { skinOf, thinFilm } from "./finish";
import type { Person } from "./people";

export const MODEL = "/models/echo.glb";
const FOV = 26;
/** The photograph's side, in pixels: sharp at the card's size on a 2× screen. */
const SHOT = 320;

export interface Studio {
  shoot(p: Person): Promise<string>;
  dispose(): void;
}

export async function openStudio(): Promise<Studio> {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SHOT;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.setPixelRatio(1);
  renderer.setSize(SHOT, SHOT, false);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.55;
  room.dispose();
  pmrem.dispose();

  const accent = pageColour("--echo-accent", "#3D8EF0");
  const sky = new HemisphereLight(0xffffff, 0x1c1628, 0.9);
  const key = new DirectionalLight(0xffffff, 2.1);
  key.position.set(-0.55, 1, 0.75);
  const rim = new DirectionalLight(accent, 3);
  rim.position.set(0.7, 0.35, -1);
  scene.add(sky, key, rim);

  const camera = new PerspectiveCamera(FOV, 1, 1, 10000);
  const dist = SHOT / 2 / Math.tan((FOV * Math.PI) / 360);
  camera.position.set(SHOT / 2, -SHOT / 2, dist);
  camera.near = Math.max(1, dist - 2000);
  camera.far = dist + 2000;
  camera.lookAt(SHOT / 2, -SHOT / 2, 0);
  camera.updateProjectionMatrix();

  const model = await loadModel(MODEL);
  const face = faceUniforms(model.map, eyeMask(), pageColour("--echo-text", "#E9F0FA"), pageColour("--echo-seam", "#131216"));
  const highlight = pageColour("--echo-accent-highlight", "#7FB2F5");
  const pressed = pageColour("--echo-accent-pressed", "#2A6BC4");
  const echo = new Creature3D(model, echoMarble(accent, highlight, pressed), face, shadowTexture());
  echo.setOutline(null);
  scene.add(echo.root);
  const brand = brandSkin(accent, highlight, pressed);

  return {
    async shoot(p) {
      echo.setSkin(skinOf(p, accent, brand));
      echo.material.iridescenceThicknessRange = thinFilm(p);
      echo.mood = p.asleep ? "sleep" : "idle";
      // A small turn and lean of its own, so a crowd of photographs isn't one Echo copied.
      const rnd = random(p.id.length * 97 + p.id.charCodeAt(p.id.length - 1));
      const pose = p.plan === "maker" ? { spin: 0, lean: 0 } : { spin: (rnd() * 2 - 1) * 0.35, lean: (rnd() * 2 - 1) * 0.08 };
      // Still: the colour washes on fully, the eyes as the drawing has them.
      echo.update(6, { x: SHOT / 2, y: SHOT * 0.46, size: SHOT * 0.66, ...pose }, null, true);
      renderer.render(scene, camera);
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
      return blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/png");
    },
    dispose() {
      echo.dispose();
      renderer.dispose();
    },
  };
}

/** Echo's own skin for the page: the brand's glaze, from the family the page wears (family.ts). */
export function brandSkin(accent: string, highlight: string, pressed: string): Skin {
  return glaze({
    seed: pageColour("--family-seed", accent),
    seedLight: pageColour("--family-seed-light", highlight),
    seedDeep: pageColour("--family-seed-deep", pressed),
    next: highlight,
    prev: pressed,
    spark: highlight,
  });
}
