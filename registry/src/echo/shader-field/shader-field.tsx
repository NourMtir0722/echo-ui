"use client";

/**
 * ShaderField — the live brand field. A domain-warped
 * fbm gradient in the Echo accent ramp that blooms toward the cursor, with
 * animated grain.
 *
 * WebGL cannot read CSS variables, so the colours have to reach the shader
 * as values. Pass `theme` (the JS mirror, `createEchoTheme().values`) to pin
 * them. Leave it out and the field reads the accent ramp from the CSS it sits
 * in — `--echo-accent-{2,3,5,7}` — and reads it again whenever a stylesheet
 * in <head>, or <html>'s class/style, changes. So a field on a page that is
 * reseeded at runtime follows the seed like every CSS-skinned component does,
 * instead of staying on the default seed's colour.
 *
 * Discipline: all WebGL lives in the effect, so this server-renders to an
 * empty canvas over a CSS gradient fallback; reduced motion draws ONE static
 * composed frame instead of running the loop; the GL context is explicitly
 * released on unmount (browsers cap live contexts, and route changes would
 * otherwise leak them).
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createEchoTheme } from "echo-ui-core/theme";
import type { EchoTheme } from "echo-ui-core/theme";
import { VERT, FRAG, hexToRgb } from "./shader";
import "./shader-field.css";

export interface ShaderFieldProps {
  /**
   * Theme mirror driving the field colours. Omit it and the field follows the
   * `--echo-accent-*` variables in scope (falling back to the default seed
   * where there are none).
   */
  theme?: EchoTheme;
  /**
   * Accessible name. Omit (the default) and the field is decorative and
   * hidden from assistive tech — which is almost always right for a
   * background.
   */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const defaultRamp = createEchoTheme({}, { quiet: true }).values.accentRamp;

/** Ramp indices of the four stops the field samples: void → mid → glow → light. */
const STOPS = [6, 4, 2, 1] as const;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** The four stops as declared in the CSS `el` sits in, or null if any is not a hex. */
function readStops(el: Element): string[] | null {
  const cs = getComputedStyle(el);
  const stops = STOPS.map((i) => cs.getPropertyValue(`--echo-accent-${i + 1}`).trim());
  return stops.every((v) => HEX.test(v)) ? stops : null;
}

export function ShaderField({ theme, label, className, style }: ShaderFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<string[] | null>(null);

  // No pinned theme: sample the CSS before first paint, then again whenever
  // the page's theme can have changed.
  useLayoutEffect(() => {
    const host = ref.current;
    if (theme || !host) return;
    const sample = () =>
      setLive((prev) => {
        const next = readStops(host);
        return prev && next && prev.join() === next.join() ? prev : next;
      });
    sample();
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sample);
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [theme]);

  const ramp = theme?.accentRamp;
  const stops = ramp ? STOPS.map((i) => ramp[i]!) : (live ?? STOPS.map((i) => defaultRamp[i]!));
  const [cVoid, cA, cB, cC] = stops as [string, string, string, string];

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    /*
     * A FRESH canvas per effect run, created here and removed in cleanup.
     *
     * Cleanup releases the GL context (browsers cap live contexts; route
     * changes would leak them). But a context released with loseContext() is
     * gone for good on THAT canvas: getContext() hands the same dead context
     * back, every compile fails with a null log, and a lost canvas paints
     * white. The effect re-runs on the same element whenever it remounts —
     * Strict Mode does exactly that in development, and so does a theme
     * change — so the field shipped as a white box after any client-side
     * navigation. A new canvas each run gets a new context.
     */
    const canvas = document.createElement("canvas");
    canvas.className = "echo-shader-field__canvas";
    host.appendChild(canvas);
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) {
      canvas.remove(); // the wrapper's CSS gradient is the fallback
      return;
    }
    // A context the browser reclaims later (GPU reset, too many contexts)
    // must not leave a white box either: drop back to the gradient.
    const onLost = () => {
      canvas.style.visibility = "hidden";
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("ShaderField:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !prog) {
      canvas.remove();
      return;
    }

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("ShaderField:", gl.getProgramInfoLog(prog));
      canvas.remove();
      return;
    }
    gl.useProgram(prog);

    // One full-screen triangle.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    gl.uniform3fv(gl.getUniformLocation(prog, "cVoid"), hexToRgb(cVoid));
    gl.uniform3fv(gl.getUniformLocation(prog, "cA"), hexToRgb(cA));
    gl.uniform3fv(gl.getUniformLocation(prog, "cB"), hexToRgb(cB));
    gl.uniform3fv(gl.getUniformLocation(prog, "cC"), hexToRgb(cC));

    const mouse: [number, number] = [0.5, 0.55];
    const target: [number, number] = [0.5, 0.55];
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      target[0] = (e.clientX - r.left) / r.width;
      target[1] = 1 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (time: number) => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse[0], mouse[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0;
    if (reduce) {
      draw(6); // one static, composed frame — no loop, no cursor tracking
    } else {
      const t0 = performance.now();
      const loop = () => {
        mouse[0] += (target[0] - mouse[0]) * 0.06;
        mouse[1] += (target[1] - mouse[1]) * 0.06;
        draw((performance.now() - t0) / 1000);
        raf = requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [cVoid, cA, cB, cC]);

  return (
    <div
      className={["echo-shader-field", className].filter(Boolean).join(" ")}
      style={style}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      ref={ref}
    />
  );
}
