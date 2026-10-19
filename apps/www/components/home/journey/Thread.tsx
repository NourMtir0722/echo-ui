"use client";

/**
 * The chat the journey happens in: Echo's own drawing of a conversation, laid
 * out the way people know a conversation with an AI to look (and nothing of
 * any one app's interface): your prompt in a filled bubble on the right; the
 * reply as plain text on the page, under the line that says it used Echo UI,
 * at reading size, bold where it leans; and the prompt box, one rounded well
 * with Send in it, the one raised, lit object. It wears Echo's Chat screen's
 * stylesheet (registry/src/echo/chat) underneath.
 *
 * It names the AI it's talking to, plainly (`Engine`): no one's logo until
 * they've said yes.
 *
 * The thread is a log, so what arrives is read out in order. It never
 * scrolls: a box that scrolls on its own catches the wheel of anyone reading
 * past it. Every message is laid out from the start and shown when its turn
 * comes (`shown`), so the card has its final height before anything arrives
 * and nothing under it moves.
 */
import type { ReactNode } from "react";
import { HardwareButton } from "@registry/echo/hardware-button";
import { Flower } from "@/components/brand/Logo";
import "@registry/echo/chat/chat.css";
import { pressProps, useDemo } from "./DemoCard";

/**
 * Who you're talking to: the AI, by name, and what's plugged into it. The
 * name alone says it's an AI; no sparkle beside it (the slop police's "the
 * sparkle for AI"), and no company's logo without its permission.
 */
export function Engine({ name, via = "with the Echo UI plugin" }: { name: string; via?: string }) {
  return (
    <span className="jy-engine">
      <span className="jy-engine__name">{name}</span>
      <span className="jy-engine__via">{via}</span>
    </span>
  );
}

export function Chat({ children, composer, label, engine = "Codex" }: { children: ReactNode; composer?: ReactNode; label: string; engine?: string }) {
  return (
    <div className="jy-chat">
      <header className="jy-chat__head">
        <Engine name={engine} />
      </header>
      <div className="echo-chat__thread jy-chat__thread" role="log" aria-label={label}>
        {children}
      </div>
      {composer}
    </div>
  );
}

/** What you sent: in the well. `shown` false: its place is kept, unseen and unread, until its turn. */
export function Mine({ children, shown = true }: { children: ReactNode; shown?: boolean }) {
  return (
    <div className="echo-chat__msg jy-msg" data-from="me" data-unseen={shown ? undefined : ""}>
      <div className="echo-chat__bubble">
        <span className="echo-chat__sr">You: </span>
        {children}
      </div>
    </div>
  );
}

/** The plugin, mentioned in a prompt as the run mentioned it: a chip, the way the agent shows one. */
export function Mention() {
  return <span className="jy-mention">@Echo UI</span>;
}

/** A prompt's text with its "@Echo UI" shown as the mention chip it was. */
export function withMention(text: string): ReactNode {
  const [before, after] = text.split("@Echo UI");
  return after === undefined ? (
    text
  ) : (
    <>
      {before}
      <Mention />
      {after}
    </>
  );
}

/**
 * What came back: plain text on the page, under the line that says what it
 * used: Echo UI, and the skill or tool the agent ran (`used`, the run's own
 * names), the way an agent shows its work.
 */
export function Theirs({ children, shown = true, wide, used = [] }: { children: ReactNode; shown?: boolean; wide?: boolean; used?: readonly string[] }) {
  return (
    <div className="echo-chat__msg jy-msg" data-from="them" data-wide={wide ? "" : undefined} data-unseen={shown ? undefined : ""}>
      <div className="echo-chat__bubble jy-msg__body">
        {/* A div, not a p: the flower is a div of its own, and a p can't hold one. */}
        <div className="jy-used">
          <Flower m={14} tier="standard" eyes={false} />
          Used Echo UI
          {used.map((u) => (
            <code key={u} className="jy-used__tool">
              {u}
            </code>
          ))}
        </div>
        <span className="echo-chat__sr">Reply: </span>
        {children}
      </div>
    </div>
  );
}

/** What the agent wrote, as file chips: the run's own file names. */
/** A file the agent wrote, as a chat shows it: what it is in words, and what kind of file (its name, as written, on hover). */
export interface RunFile {
  name: string;
  title: string;
  kind: "doc" | "zip" | "image";
}

const KIND = { doc: "Document", zip: "ZIP archive", image: "Image" } as const;

function FileIcon({ kind }: { kind: RunFile["kind"] }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {kind === "image" ? (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <path d="M3.5 16l5-5 4 4 3-3 5 5" />
        </>
      ) : kind === "zip" ? (
        <>
          <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
          <path d="M4 8l8 4 8-4M12 12v8" />
        </>
      ) : (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </>
      )}
    </svg>
  );
}

export function Files({ files }: { files: readonly RunFile[] }) {
  return (
    <ul className="jy-files" aria-label="Files it wrote">
      {files.map((f) => (
        <li key={f.name} className="jy-file" title={f.name}>
          <FileIcon kind={f.kind} />
          <span className="jy-file__words">
            <span className="jy-file__title">{f.title}</span>
            <span className="jy-file__kind">{KIND[f.kind]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The composer, holding the prompt about to be sent, and Send: Echo's press
 * number `press` lands on it. After the press the well is empty again.
 */
export function Composer({ prompt, press, sent, onSend }: { prompt: ReactNode; press: number; sent: boolean; onSend: () => void }) {
  const { held } = useDemo();
  return (
    <div className="echo-chat__composer jy-chat__composer">
      <p className="jy-chat__draft" data-empty={sent ? "" : undefined}>
        {sent ? "Prompt" : prompt}
      </p>
      <span className="jy-press" {...pressProps(press)}>
        <HardwareButton
          variant="primary"
          iconOnly
          aria-label="Send"
          icon={<SendIcon />}
          held={held === press}
          disabled={sent}
          onClick={onSend}
        />
      </span>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
