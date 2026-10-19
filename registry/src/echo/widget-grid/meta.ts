import { z } from "zod";

export const widgetGridProps = z.object({
  label: z.string().describe('What the grid is: its accessible name ("Home").'),
  items: z
    .array(z.object({ id: z.string(), label: z.string(), size: z.enum(["1x1", "2x1", "2x2", "4x2"]).optional(), content: z.unknown() }))
    .describe("The widgets: an id, the name its keys and announcements use, the columns × rows it takes, and your content."),
  order: z.array(z.string()).optional().describe("The order, by id (controlled)."),
  defaultOrder: z.array(z.string()).optional().describe("The starting order, by id (uncontrolled). See order."),
  onOrderChange: z.function().optional().describe("Called with the new order, by id."),
  editing: z.boolean().optional().describe("Showing the Move and Remove keys (controlled)."),
  defaultEditing: z.boolean().default(false).describe("Whether it starts showing the Move and Remove keys (uncontrolled). See editing."),
  onEditingChange: z.function().optional().describe("Called when editing turns on or off."),
  onRemove: z.function().optional().describe("Lets a widget be removed; called with its id."),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(4).describe("Columns on a wide screen; it narrows to 2 on a phone."),
});

export const meta = {
  name: "echo-widget-grid",
  title: "WidgetGrid",
  description:
    "Widgets at fixed footprints (1×1, 2×1, 2×2, 4×2) on a grid people arrange for themselves: a dashboard, a home screen, a panel of gauges. Each widget is your own content; the grid gives it a place. Arrange it and each widget gets a Move key and, if you allow it, a Remove key: drag a widget by its Move key and the others slide out of its way, or use the arrow keys and the new place is said.",
  props: widgetGridProps,
  examples: [
    {
      title: "A home screen",
      description: "Readouts and an instrument, arranged by whoever's looking.",
      code: '<WidgetGrid\n  label="Home"\n  items={[\n    { id: "today", label: "Today", content: <DateTile date="2026-09-25" size="lg" /> },\n    { id: "latency", label: "Latency", content: <StatTile value="42" unit="ms" label="Latency" /> },\n    { id: "volume", label: "Volume", size: "2x1", content: <Tuner label="Volume" max={11} /> },\n  ]}\n/>',
    },
    {
      title: "Saved order",
      description: "Keep the order people choose.",
      code: '<WidgetGrid label="Dashboard" items={widgets} order={order} onOrderChange={saveOrder} onRemove={hide} />',
    },
  ],
  feel: "Tiles you pick up and put down: the others make room, and they land with a small settle.",
  usage: {
    imports: 'import { WidgetGrid } from "@/echo/widget-grid";\nimport { StatTile } from "@/echo/stat-tile";',
    code: '<WidgetGrid label="Home" items={[{ id: "a", label: "Latency", content: <StatTile value="42" label="Latency" /> }]} />',
  },
  composition: "WidgetGrid\n  HardwareButton (Arrange, Done)\n  the grid: a list item per widget, your content, and while arranging HardwareButton (Move) and HardwareButton (Remove)",
  a11y: [
    "A region named by `label`; the widgets are a list, in the order they're shown.",
    "Arranging is a button that says what it does (\"Arrange Home\", \"Done arranging Home\").",
    "Each Move key is named with its widget and moves it with the arrow keys (Home and End to the ends); the new place is announced (\"Weather moved to place 3 of 6\").",
    "Dragging is a pointer extra: everything it does, the Move key's arrows do.",
    "Remove keys are named with their widget, and only appear when removing is allowed.",
  ],
  motion: {
    tokens: ["travel"],
    reducedMotion: "Widgets change places at once; nothing slides.",
  },
  sound: ["A tap as a widget takes a new place, and the select click when one is moved by key, inside a SoundProvider."],
  antiPatterns: [
    "Never use a WidgetGrid for content with an order that means something (a list of steps): only for things people arrange by taste.",
    "Never forget onOrderChange when the arrangement should last: without it, the order is lost on reload.",
  ],
} as const;
