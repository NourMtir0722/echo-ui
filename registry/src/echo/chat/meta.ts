import { z } from "zod";

export const chatScreenProps = z.object({
  embedded: z
    .boolean()
    .default(false)
    .describe("This screen is inside another page: the title drops to <h2>, so the page keeps one <h1>. Never set it on the screen that owns the page."),
  participant: z.string().default("Echo").describe("Who you are talking to — the header name and the avatar."),
  subtitle: z.string().default("Session assistant").describe("Under the name: a role, a channel, a device."),
  messages: z
    .array(z.object({ id: z.string(), from: z.enum(["me", "them"]), text: z.string(), time: z.string() }))
    .optional()
    .describe("The thread so far, oldest first. Defaults to a demo conversation."),
  onSend: z
    .function()
    .optional()
    .describe("Called with the sent text. Return (or resolve to) the reply to show it after the typing indicator."),
  replies: z.array(z.string()).optional().describe("Canned replies, cycled — used only without onSend."),
});

export const meta = {
  name: "echo-chat",
  title: "Chat screen",
  description:
    "One conversation as a front panel: an Avatar and StatusDot header, a message log, a Loader typing indicator, and a Textarea composer with one lit Send cap. Proves that the material language survives running text — incoming messages get no container, yours sit in the composer's recessed well, and the only raised object is Send.",
  props: chatScreenProps,
  examples: [
    {
      title: "Wired to your backend",
      description: "Resolve with the reply and it lands after the typing indicator.",
      code: [
        "<ChatScreen",
        '  participant="Studio A"',
        "  onSend={async (text) => {",
        "    const res = await fetch(\"/api/chat\", { method: \"POST\", body: text });",
        "    return (await res.json()).reply;",
        "  }}",
        "/>",
      ].join("\n"),
    },
  ],
  feel: "A conversation as a front panel: your words sit in a recessed well, theirs on the ground, and Send is the only raised thing.",
  usage: {
    imports: "import { ChatScreen } from \"@/echo/chat\";",
    code: [
      "<main>",
      "  <ChatScreen",
      "    participant=\"Studio A\"",
      "    onSend={async (text) => {",
      "      const res = await fetch(\"/api/chat\", { method: \"POST\", body: text });",
      "      return (await res.json()).reply;",
      "    }}",
      "  />",
      "</main>",
    ].join("\n"),
  },
  composition: "ChatScreen\n  Avatar\n  StatusDot\n  Loader\n  Textarea\n  HardwareButton",
  a11y: [
    "The thread is `role=\"log\"`, named “Conversation with …”: new messages are announced politely, in order.",
    "The typing indicator is its own status (a Loader), so the log does not announce “typing” as a message.",
    "Enter sends and Shift+Enter starts a new line; Enter during IME composition does not send.",
    "The screen owns the page's `<h1>`. Inside another page, pass `embedded` and the title drops to `<h2>`.",
    "It renders no `<main>` of its own: put it inside your page's `<main>`, or the page has no main landmark.",
  ],
  sound: [
    "From its parts: `press` / `release` on the Send cap.",
  ],
  antiPatterns: [
    "Do not put incoming messages in raised cards. Forty molded bubbles on one screen is forty competing controls; running text sits on the ground, and only Send is raised.",
    "Do not put the typing indicator inside the message log. role=\"log\" announces every addition — an indicator in it is read out between every message.",
    "Do not scroll the page to the newest message. Scroll the thread; an embedded chat that moves the document it sits in is a bug in someone else's page.",
    "Do not send on Enter while an IME composition is active. That is the key a Japanese or Chinese typist presses to accept a word.",
    "Do not colour your messages with the accent. Accent is the lit Send cap; a thread of accent bubbles makes every message read as a button.",
  ],
} as const;
