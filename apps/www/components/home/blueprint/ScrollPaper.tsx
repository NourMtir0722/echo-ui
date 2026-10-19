"use client";

/**
 * The blueprint as real paper (Paperlab's `scroll` behavior): a
 * sheet wound on a rod at each end, the two rolls meeting in the middle, that
 * opens outward across the section and stops with each end still rolled, the
 * way a scroll is held open.
 *
 * Laid out in the page's pixels (a hundred to a unit): the camera stands
 * where a pixel at the paper's depth is a pixel on screen, so the drawing laid
 * over the paper's flat middle (Blueprint.tsx) sits exactly on it.
 *
 * Blueprint.tsx opens it: `open` says how far, read every frame, and `lift`
 * how far it has risen to face you (0: leaning back and further away, as it
 * arrives; 1: upright, a pixel to a pixel, where the drawing lies on it). The
 * canvas draws only when they change (and a moment after, for the paper to
 * settle). Still, it draws nothing.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PaperLighting, PaperMesh, supportsWebGL, type PaperHandle } from "paperlab";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Group, PerspectiveCamera } from "three";

/** Whether the paper can be drawn here at all. */
export const canUnroll = () => supportsWebGL();

/** Pixels to a world unit. */
const U = 100;
const FOV = 30;

/** Paper still wound at each end once it's open, as a share of its width; and how big the rods are, in units. */
export const ENDS = 0.06;
const CORE = 0.12;
/** Before it has risen: leaning back this far (radians), this far behind the page and this far below it (units). */
const TILT = 0.58;
const BACK = 3.4;
const LOW = 0.6;

/** Stands the camera where a pixel at the paper's depth is a pixel on screen. */
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

/** Asks for a frame whenever the paper should move: when `open` or `lift` changes, and for a moment after. */
function Driver({ open, lift }: { open: () => number; lift: () => number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = -1;
    let until = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const v = Math.round(open() * 1000) / 1000 + Math.round(lift() * 1000) * 1000;
      if (v !== last) {
        last = v;
        until = now + 300;
      }
      if (now < until) invalidate();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open, lift, invalidate]);
  return null;
}

function Sheet({ width, height, front, back, open, lift }: { width: number; height: number; front: string; back: string; open: () => number; lift: () => number }) {
  const paper = useRef<PaperHandle>(null);
  const pose = useRef<Group>(null);
  const last = useRef(-1);
  const invalidate = useThree((s) => s.invalidate);
  // Drawn again with new faces (the section resized), the paper starts from its own `progress` again: it's told
  // how open it is once more, and drawn.
  useEffect(() => {
    last.current = -1;
    invalidate();
  });
  useFrame(() => {
    const v = Math.round(open() * 1000) / 1000;
    if (v !== last.current) paper.current?.set("progress", (last.current = v));
    // Rising to face you: from leaning back, further off and lower, to upright where the page's pixels are.
    const g = pose.current;
    if (g) {
      const down = 1 - lift();
      g.rotation.x = -TILT * down;
      g.position.set(0, -LOW * down, -BACK * down);
    }
  });
  return (
    <group ref={pose}>
      <PaperMesh
        ref={paper}
        sheet={{ width: width / U, height: height / U }}
        stock="printer"
        content={{ type: "image", src: front, fit: "cover", back: { type: "image", src: back, fit: "cover" } }}
        behavior={{ type: "scroll", progress: 0, ends: ENDS, tightness: 0.55, core: CORE, along: "width" }}
        physics="none"
        reducedMotion={false}
      />
    </group>
  );
}

export function ScrollPaper({
  width,
  height,
  front,
  back,
  open,
  lift = () => 1,
}: {
  /** The paper's size, in CSS pixels. */
  width: number;
  height: number;
  /** Its two faces, as pictures. */
  front: string;
  back: string;
  /** How far it's open, 0 to 1, read every frame. */
  open: () => number;
  /** How far it has risen to face you, 0 to 1, read every frame. */
  lift?: () => number;
}) {
  return (
    <Canvas
      className="bp__paper"
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: FOV }}
      frameloop="demand"
      aria-hidden="true"
    >
      <PixelCamera />
      <Driver open={open} lift={lift} />
      <PaperLighting preset="studio" contactShadow={false} shadowMapSize={0} />
      <Sheet width={width} height={height} front={front} back={back} open={open} lift={lift} />
    </Canvas>
  );
}
