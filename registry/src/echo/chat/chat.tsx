"use client";

/**
 * The chat screen (a template, like auth / settings / console).
 *
 * One conversation as a front panel: a header with who you are talking to and
 * whether they are there, the thread, and a composer. What it proves is the
 * thing the other three templates do not reach — whether the material
 * language survives RUNNING TEXT, where most of the screen is words rather
 * than controls.
 *
 * The answer it commits to is restraint:
 *   - incoming messages have no container at all — text beside an avatar;
 *   - outgoing messages sit in a recessed well, the same material as the
 *     composer they were typed into, so "what I wrote" reads as one thing
 *     from the textarea to the thread;
 *   - the only raised, lit object on the screen is the Send cap.
 *
 * No backend: `onSend` hands you the text and may return (or resolve to) the
 * reply. Without it the screen answers from `replies`, so it is alive as a
 * demo.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "../avatar";
import { Textarea } from "../textarea";
import { HardwareButton } from "../hardware-button";
import { Loader } from "../loader";
import { StatusDot } from "../status-dot";
import { Kbd } from "../kbd";
import "./chat.css";

export interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  /** Shown as-is, in the machine voice. */
  time: string;
}

export interface ChatScreenProps {
  /**
   * This screen is inside another page: the title drops to <h2>, so the page
   * keeps one <h1>. Never set it on the screen that owns the page.
   */
  embedded?: boolean;
  /** Who you are talking to. */
  participant?: string;
  /** Under the name: a role, a channel, a device. */
  subtitle?: string;
  /** The thread so far, oldest first. Defaults to a demo conversation. */
  messages?: ChatMessage[];
  /**
   * Called with what you sent. Return (or resolve to) the reply text to have
   * it appear after the typing indicator; return nothing to reply yourself
   * later through `messages`.
   */
  onSend?: (text: string) => string | void | Promise<string | void>;
  /** Canned replies, cycled, used only when there is no `onSend`. */
  replies?: string[];
}

const DEMO: ChatMessage[] = [
  { id: "m1", from: "them", time: "09:41", text: "Morning. The take from last night is on the device — 4:12, peaking at −3 dB." },
  { id: "m2", from: "me", time: "09:43", text: "Can you trim the first eight seconds? There is a chair squeak before the count-in." },
  { id: "m3", from: "them", time: "09:43", text: "Trimmed. The count-in now starts on the downbeat." },
];

const DEMO_REPLIES = [
  "Done. It is on the device.",
  "Noted — I will keep that for the next session.",
  "Saved. Changes apply to this device only.",
];

const clock = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function SendIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}

export function ChatScreen({
  embedded,
  participant = "Echo",
  subtitle = "Session assistant",
  messages: initial = DEMO,
  onSend,
  replies = DEMO_REPLIES,
}: ChatScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const replyIndex = useRef(0);
  const nextId = useRef(0);
  const thread = useRef<HTMLDivElement>(null);
  const Title = embedded ? "h2" : "h1";

  // Keep the newest message in view. Scrolling the thread, not the page: an
  // embedded screen must never yank the document it sits in.
  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const push = (from: ChatMessage["from"], text: string) =>
    setMessages((list) => [...list, { id: `n${nextId.current++}`, from, text, time: clock() }]);

  async function send() {
    const text = draft.trim();
    if (!text || typing) return;
    push("me", text);
    setDraft("");
    setTyping(true);
    try {
      let reply: string | void;
      if (onSend) {
        reply = await onSend(text);
      } else {
        // A short, honest pause: long enough to see the indicator, short
        // enough that the demo does not feel slow.
        await new Promise((r) => setTimeout(r, 900));
        reply = replies[replyIndex.current++ % Math.max(replies.length, 1)];
      }
      if (reply) push("them", reply);
    } finally {
      setTyping(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter is a new line. IME composition must not send.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="echo-chat">
      <header className="echo-chat__head">
        <Avatar name={participant} size="md" />
        <div className="echo-chat__who">
          <Title className="echo-chat__name">{participant}</Title>
          <span className="echo-chat__sub">
            <StatusDot on decorative />
            online · {subtitle}
          </span>
        </div>
      </header>

      {/*
        role="log": new messages are announced politely, in order, and the
        history is not re-read. The typing indicator lives OUTSIDE it — it is
        its own status region (Loader), and a log that announced "typing"
        between every message would be noise.
      */}
      <div className="echo-chat__thread" ref={thread} role="log" aria-label={`Conversation with ${participant}`}>
        <p className="echo-chat__day">Today</p>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = prev?.from === m.from;
          return (
            <div
              key={m.id}
              className="echo-chat__msg"
              data-from={m.from}
              data-grouped={grouped || undefined}
            >
              {m.from === "them" && (
                <span className="echo-chat__avatar" aria-hidden="true">
                  {!grouped && <Avatar name={participant} size="sm" />}
                </span>
              )}
              <div className="echo-chat__bubble">
                <span className="echo-chat__sr">{m.from === "me" ? "You" : participant}: </span>
                {m.text}
              </div>
              <span className="echo-chat__time">{m.time}</span>
            </div>
          );
        })}
      </div>

      <div className="echo-chat__typing" data-on={typing || undefined}>
        {typing && <Loader dot={7} label={`${participant} is typing`} />}
      </div>

      <form
        className="echo-chat__composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Textarea
          aria-label={`Message ${participant}`}
          placeholder={`Message ${participant}`}
          value={draft}
          onValueChange={setDraft}
          onKeyDown={onKeyDown}
          rows={1}
          maxRows={6}
        />
        <HardwareButton
          type="submit"
          variant="primary"
          iconOnly
          aria-label="Send"
          icon={<SendIcon />}
          disabled={!draft.trim() || typing}
        />
      </form>
      <p className="echo-chat__hint">
        <Kbd>↩</Kbd> to send · <Kbd>⇧</Kbd> <Kbd>↩</Kbd> for a new line
      </p>
    </div>
  );
}
