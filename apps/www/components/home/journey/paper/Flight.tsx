"use client";

/**
 * The two style sheets as real paper (Paperlab), in flight from where they
 * lie in Make a style with AI to where they land in Pick it, and try it on
 * (PaperRoad.tsx).
 *
 * One canvas over the whole window, out of the pointer's way. Its world is
 * measured in the page's pixels (a hundred to a unit): the camera stands
 * where a pixel at the page's depth is a pixel on screen, so a sheet can take
 * off from exactly where its picture was and land exactly where its next one
 * is. Each frame, `pose` says where a sheet is, how it's turned, how high it
 * has lifted off the page and how much it flutters and curls; the paper does
 * the bending (its `fall` behaviour), the pose does the travelling.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PaperLighting, PaperMesh, type PaperHandle } from "paperlab";
import { useLayoutEffect, useRef } from "react";
import type { Group, PerspectiveCamera } from "three";
import type { Pose } from "./drift";
import type { SheetPicture } from "./sheet-image";

/** Pixels to a world unit. */
const U = 100;
const FOV = 30;

/** Stands the camera where a pixel at the page's depth is a pixel on screen. */
function PixelCamera() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.fov = FOV;
    cam.position.set(0, 0, size.height / U / 2 / Math.tan(((FOV / 2) * Math.PI) / 180));
    cam.near = 0.1;
    cam.far = 400;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Sheet({ picture, pose, onDrawn }: { picture: SheetPicture; pose: () => Pose; onDrawn?: () => void }) {
  const group = useRef<Group>(null);
  const paper = useRef<PaperHandle>(null);
  const last = useRef({ flutter: -1, curl: -1 });
  const { size } = useThree();
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const p = pose();
    g.visible = p.visible;
    if (!p.visible) return;
    onDrawn?.();
    // Set back by `depth`, it's drawn as much bigger and further out, so it looks just where it would at the page.
    const d = size.height / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
    const back = (d + p.depth) / d;
    g.position.set(((p.x - size.width / 2) * back) / U, (-(p.y - size.height / 2) * back) / U, (p.z - p.depth) / U);
    g.rotation.set(p.rx, p.ry, p.rz);
    g.scale.setScalar((p.w * back) / U);
    const f = Math.round(p.flutter * 100) / 100;
    const c = Math.round(p.curl * 100) / 100;
    if (f !== last.current.flutter) paper.current?.set("flutter", (last.current.flutter = f));
    if (c !== last.current.curl) paper.current?.set("curl", (last.current.curl = c));
  });
  return (
    <group ref={group} visible={false}>
      <PaperMesh
        ref={paper}
        sheet={{ width: 1, height: picture.aspect }}
        stock="printer"
        content={{ type: "image", src: picture.src, fit: "cover" }}
        behavior={{ type: "fall", flutter: 0, curl: 0 }}
        physics="none"
        reducedMotion={false}
      />
    </group>
  );
}

/**
 * `flying`: a sheet is in the air; otherwise the canvas draws nothing and stays out of sight. `onDrawn`
 * is told each frame a sheet is drawn, so the page hides its own sheet only once the paper is there.
 */
export function Flight({
  sheets,
  flying,
  onDrawn,
}: {
  sheets: { picture: SheetPicture; pose: () => Pose }[];
  flying: boolean;
  onDrawn?: () => void;
}) {
  return (
    <Canvas
      className="jy-flight"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: FOV }}
      frameloop={flying ? "always" : "never"}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 40, visibility: flying ? "visible" : "hidden" }}
    >
      <PixelCamera />
      <PaperLighting preset="studio" contactShadow={false} shadowMapSize={0} />
      {sheets.map((s, i) => (
        <Sheet key={i} picture={s.picture} pose={s.pose} onDrawn={onDrawn} />
      ))}
    </Canvas>
  );
}
