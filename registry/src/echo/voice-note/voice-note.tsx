"use client";

/**
 * VoiceNote. The microphone button opens into Stop and the take beside it,
 * whose level bars follow your voice while the Stop button swells with it.
 * Stop, and Stop is swallowed by the take, which becomes a note you can play:
 * it fills with the primary plastic as it plays. × (or Escape) deletes it and
 * everything folds back into the microphone.
 *
 * Real HardwareButtons in a Morph: the take and the note are the same cap
 * (`data-morph`), so it's the take that becomes the note. It records with
 * the browser's MediaRecorder; if the microphone isn't allowed it says so
 * and stays closed.
 */
import { useEffect, useRef, useState } from "react";
import { createSpring, type MorphFeelName } from "echo-ui-core/tactile";
import { HardwareButton } from "../hardware-button";
import { Morph } from "../morph";
import "./voice-note.css";

export interface VoiceNoteProps {
  /** Called when a take is kept, with the recording (or null if the browser gave none) and its length, ms. */
  onRecorded?: (audio: Blob | null, ms: number) => void;
  /** Called when the note is deleted. */
  onDelete?: () => void;
  /** Longest take, ms. Default 60s. */
  maxDuration?: number;
  feel?: MorphFeelName;
  size?: "sm" | "md" | "lg";
  align?: "center" | "start" | "end";
  className?: string;
}

const Svg = ({ d }: { d: string }) => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const Mic = () => <Svg d="M8 2a2 2 0 00-2 2v4a2 2 0 004 0V4a2 2 0 00-2-2zM3.5 7.5a4.5 4.5 0 009 0M8 12v2" />;
const Close = () => <Svg d="M4 4l8 8M12 4l-8 8" />;
const Stop = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" aria-hidden>
    <rect x="3.5" y="3.5" width="9" height="9" rx="2" fill="currentColor" />
  </svg>
);
const Play = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" aria-hidden>
    <path d="M5 3.2v9.6l8-4.8z" fill="currentColor" />
  </svg>
);
const Pause = () => (
  <svg width="100%" height="100%" viewBox="0 0 16 16" aria-hidden>
    <path d="M4.5 3h2.6v10H4.5zM8.9 3h2.6v10H8.9z" fill="currentColor" />
  </svg>
);

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const BARS = 18;

/** The microphone: its level while recording, and the take when stopped. */
class Mic_ {
  private ctx?: AudioContext;
  private an?: AnalyserNode;
  private buf?: Float32Array<ArrayBuffer>;
  private stream?: MediaStream;
  private rec?: MediaRecorder;
  private chunks: Blob[] = [];

  async start(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = stream;
      this.ctx = new AudioContext();
      this.an = this.ctx.createAnalyser();
      this.an.fftSize = 1024;
      this.ctx.createMediaStreamSource(stream).connect(this.an);
      this.buf = new Float32Array(this.an.fftSize);
      if (typeof MediaRecorder !== "undefined") {
        this.rec = new MediaRecorder(stream);
        this.chunks = [];
        this.rec.ondataavailable = (e) => this.chunks.push(e.data);
        this.rec.start();
      }
      return true;
    } catch {
      this.release();
      return false;
    }
  }

  level(): number {
    if (!this.an || !this.buf) return 0;
    this.an.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (const v of this.buf) sum += v * v;
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 7);
  }

  async stop(): Promise<Blob | null> {
    let blob: Blob | null = null;
    const rec = this.rec;
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((done) => {
        rec.onstop = () => done();
        rec.stop();
      });
      blob = new Blob(this.chunks, { type: rec.mimeType });
    }
    this.release();
    return blob;
  }

  release() {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => undefined);
    this.stream = undefined;
    this.ctx = undefined;
    this.an = undefined;
    this.rec = undefined;
  }
}

type Phase = "idle" | "rec" | "note";

export function VoiceNote({
  onRecorded,
  onDelete,
  maxDuration = 60_000,
  feel,
  size,
  align,
  className,
}: VoiceNoteProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [playing, setPlaying] = useState(false);
  const [length, setLength] = useState(0);
  const [status, setStatus] = useState("");
  const mic = useRef<Mic_ | null>(null);
  const loop = useRef(0);
  const started = useRef(0);
  const levels = useRef<number[]>([]);
  const wave = useRef<number[]>([]);
  const bars = useRef<HTMLSpanElement>(null);
  const time = useRef<HTMLSpanElement>(null);
  const swell = useRef<HTMLSpanElement>(null);
  const take = useRef<HTMLButtonElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);

  const drawBars = (data: number[]) => {
    const el = bars.current;
    if (!el) return;
    for (let i = 0; i < BARS; i++) {
      const v = data[data.length - BARS + i] ?? 0;
      (el.children[i] as HTMLElement | undefined)?.style.setProperty("--level", (0.14 + 0.86 * v).toFixed(3));
    }
  };

  const release = () => {
    cancelAnimationFrame(loop.current);
    mic.current?.release();
    mic.current = null;
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    audio.current = null;
  };
  useEffect(() => release, []);

  const record = async () => {
    // One microphone at a time: a second press while the browser is still
    // asking for it is the same press.
    if (mic.current) return;
    const m = new Mic_();
    mic.current = m;
    const granted = await m.start();
    // Let go while it was asking (unmounted, or released): close what it got.
    if (mic.current !== m) {
      m.release();
      return;
    }
    if (!granted) {
      mic.current = null;
      setStatus("Microphone unavailable");
      return;
    }
    started.current = performance.now();
    levels.current = [];
    setPhase("rec");
    setStatus("Recording");
    // The voice swells the Stop button it is going into, evenly, like a drop filling.
    const s = createSpring(1, { duration: 0.12, bounce: 0 }, (v) => {
      if (swell.current) swell.current.style.scale = v.toFixed(3);
    });
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = 0;
    const tick = (now: number) => {
      const lvl = m.level();
      if (!reduced) s.to(1 + lvl * 0.14, { config: { duration: 0.12, bounce: 0 } });
      if (now - last > 70) {
        levels.current.push(lvl);
        if (levels.current.length > 400) levels.current.shift();
        last = now;
        drawBars(levels.current);
      }
      const ms = now - started.current;
      if (time.current) time.current.textContent = clock(ms);
      if (ms >= maxDuration) {
        s.stop();
        void stop();
      } else loop.current = requestAnimationFrame(tick);
    };
    loop.current = requestAnimationFrame(tick);
  };

  const stop = async () => {
    cancelAnimationFrame(loop.current);
    if (swell.current) swell.current.style.scale = "";
    const ms = performance.now() - started.current;
    const m = mic.current;
    mic.current = null;
    const blob = (await m?.stop()) ?? null;
    // The note's waveform: the whole take, squeezed into the bars.
    const all = levels.current;
    wave.current = Array.from({ length: BARS }, (_, i) => {
      const a = Math.floor((i * all.length) / BARS);
      const b = Math.max(a + 1, Math.floor(((i + 1) * all.length) / BARS));
      const slice = all.slice(a, b);
      return slice.length ? Math.max(...slice) : 0;
    });
    if (blob && blob.size > 0) url.current = URL.createObjectURL(blob);
    setLength(ms);
    setPhase("note");
    setStatus(`Voice note, ${clock(ms)}`);
    onRecorded?.(blob, ms);
  };

  // The note's bars are drawn once it's on screen.
  useEffect(() => {
    if (phase === "note") drawBars(wave.current);
  }, [phase]);

  const play = () => {
    const cap = take.current;
    if (playing) {
      audio.current?.pause();
      cancelAnimationFrame(loop.current);
      setPlaying(false);
      return;
    }
    if (url.current) {
      audio.current ??= new Audio(url.current);
      if (audio.current.ended) audio.current.currentTime = 0;
      void audio.current.play().catch(() => undefined);
    }
    const from = performance.now() - (audio.current?.currentTime ?? 0) * 1000;
    setPlaying(true);
    const tick = (now: number) => {
      const a = audio.current;
      const played = a && url.current ? a.currentTime * 1000 : now - from;
      const f = Math.min(1, played / Math.max(1, length));
      cap?.style.setProperty("--hw-fill", f.toFixed(4));
      if (time.current) time.current.textContent = clock(length * (1 - f));
      if (f < 1 && !(a && a.ended)) loop.current = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        cap?.style.setProperty("--hw-fill", "0");
        if (time.current) time.current.textContent = clock(length);
      }
    };
    loop.current = requestAnimationFrame(tick);
  };

  const remove = () => {
    release();
    setPlaying(false);
    setPhase("idle");
    setStatus("Voice note deleted");
    onDelete?.();
  };

  const barSpans = (
    <span ref={bars} className="echo-voice-note__bars" aria-hidden>
      {Array.from({ length: BARS }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );

  return (
    <Morph
      feel={feel}
      align={align}
      className={["echo-voice-note", className].filter(Boolean).join(" ")}
      status={status}
      onEscape={phase === "note" ? remove : undefined}
    >
      {phase === "idle" ? (
        <HardwareButton data-morph="mic" size={size} icon={<Mic />} iconOnly aria-label="Record a voice note" onClick={() => void record()} />
      ) : phase === "rec" ? (
        <>
          <span ref={swell} className="echo-voice-note__swell">
            <HardwareButton
              data-morph="mic"
              variant="primary"
              size={size}
              icon={<Stop />}
              iconOnly
              aria-label="Stop recording"
              onClick={() => void stop()}
            />
          </span>
          <HardwareButton data-morph="take" size={size} disabled aria-label="Recording">
            <span className="echo-voice-note__take">
              {barSpans}
              <span ref={time} className="echo-voice-note__time">
                0:00
              </span>
            </span>
          </HardwareButton>
        </>
      ) : (
        <>
          <HardwareButton
            ref={take}
            data-morph="take"
            size={size}
            icon={playing ? <Pause /> : <Play />}
            fill={0}
            aria-label={`${playing ? "Pause" : "Play"} voice note, ${clock(length)}`}
            onClick={play}
          >
            <span className="echo-voice-note__take">
              {barSpans}
              <span ref={time} className="echo-voice-note__time">
                {clock(length)}
              </span>
            </span>
          </HardwareButton>
          <HardwareButton data-morph="close" size={size} icon={<Close />} iconOnly aria-label="Delete voice note" onClick={remove} />
        </>
      )}
    </Morph>
  );
}
