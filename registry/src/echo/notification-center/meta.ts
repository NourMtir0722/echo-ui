import { z } from "zod";

export const notificationCenterProps = z.object({
  notifications: z
    .array(z.object({ id: z.string(), title: z.string(), body: z.unknown().optional(), time: z.string().optional(), read: z.boolean().optional(), href: z.string().optional() }))
    .describe("Newest first: a title, a line, when, whether it's read, where it goes."),
  onOpen: z.function().optional().describe("Called with the id when one is opened; mark it read here."),
  onReadAll: z.function().optional().describe('Called by "Mark all read".'),
  emptyText: z.unknown().optional().describe('What an empty inbox says. Default "Nothing new."'),
});

export const meta = {
  name: "echo-notification-center",
  title: "NotificationCenter",
  description:
    "An inbox of what happened: a bell key with the unread count, opening a panel of notifications as Items, newest first, each with an LED lit while unread. Opening one marks it read; \"Mark all read\" clears them. Where a toast goes after it's gone.",
  props: notificationCenterProps,
  examples: [
    {
      title: "In a top bar",
      description: "The count is on the bell and in its name.",
      code: '<NotificationCenter\n  notifications={items}\n  onOpen={(id: string) => markRead(id)}\n  onReadAll={markAllRead}\n/>',
    },
  ],
  feel: "A small bell with a lit number on it; open it and the unread ones glow.",
  usage: {
    imports: 'import { NotificationCenter } from "@/echo/notification-center";',
    code: "<NotificationCenter notifications={items} onReadAll={markAllRead} />",
  },
  composition: "NotificationCenter → a HardwareButton trigger with a CountBadge, a Popover with a list of Items",
  a11y: [
    "The bell is a button named with the count (\"Notifications, 3 unread\"); the badge on it is decoration.",
    "The panel is a titled Popover; focus moves into it and Escape returns to the bell.",
    "Each notification is one link or button; unread ones say \"(unread)\".",
  ],
  motion: {
    tokens: [],
    reducedMotion: "The panel appears without blooming (Popover's rule).",
  },
  antiPatterns: [
    "Never make the notification center the only record of something important: link to where it lives.",
    "Never show an unread count that never goes down: opening must mark read.",
  ],
} as const;
