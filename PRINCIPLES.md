# Principles

Echo is a device, not a skin. Every component is a part of the same piece of hardware: molded
plastic, lit from one side, with screens that glow and keys that travel when you press them. That
makes Echo opinionated, and opinionated systems usually make every product look the same. Echo
avoids that by splitting what it believes from what you choose.

- **The grammar is locked.** How light falls, what a surface is made of, how a key moves, what a
  sound means, and the accessibility floor. It's what makes Echo feel like one device, so you
  can't turn it off.
- **The vocabulary is yours.** Your color, your chassis, your type, how round and how dense your
  device is, and what its plastic feels like. It's what makes your product look like itself.

## One device

Everything you ship with Echo should look like it came off the same production line. A component
earns its place by fitting the device, not by filling a gap in a list: if something can't be made
from Echo's materials, Echo doesn't ship it. That's why the date picker waited: a generic grid of
numbers wouldn't have belonged. It shipped once it could be made of the device, a date dialled into
split-flap wheels and chosen on a lit screen.

**Don't** mix Echo parts with flat components from another library on the same surface. The eye
reads two devices, and the flat one looks broken.

## One light

There is one key light, and it comes from the upper left (145°). Every highlight, shadow and bevel
agrees with it. That agreement is most of what makes a flat screen read as a physical object.

Depth is how the light meets a surface:

- **Raised** surfaces catch light on their top edge and cast a shadow below. They're things you
  touch.
- **Recessed** surfaces are shaded at the top and lit at the bottom lip. They're things you put
  something into.
- **Flush** surfaces sit on the chassis and do neither.

**Don't** add a shadow that disagrees with the light, a glow "for emphasis", or a second light
source. A surface lit from two sides stops being an object.

## Materials

Each material has one job, and its look tells you the job before you read a label.

| Material | What it is | Used for |
| --- | --- | --- |
| **Chassis** | The matte body everything is mounted in | Pages, panels, the ground |
| **Cap** | Raised, glossy plastic | Things you press: buttons, keys, tabs, segments |
| **Well** | A recess in the chassis | Things you type into or that hold a value: fields, tracks, switch beds |
| **Screen** | A dark, lit display behind glass | Things that report: readouts, LCD tags, stats, logs |
| **Glass** | A translucent slab that floats | Things that arrive and leave: dialogs, sheets, toasts |

**Don't** use a material for the wrong job, like a raised cap for a read-only value or a well for a
button. People press what looks pressable.

## One accent, one job each

Echo has one saturated color: your accent. It has exactly two jobs, and it never does anything
else.

- **A lit cap.** The one molded surface that's "on": the primary button, the current page, the
  selected segment. It wears the primary cap (`--echo-primary-cap-*`) with ivory text.
- **Something emitting light.** LEDs, LCD digits, meter cells, the "you are here" rail. They glow
  in `--echo-accent` and `--echo-accent-glow`.

Three rules keep it that way:

- **One "you are here".** A 2px lit rail: beside the label in a sidebar, under it in tabs.
- **One separator.** Every rule is the same seam: a dark groove over a faint light lip.
- **No outer glows on controls.** Light comes from screens and LEDs, not from buttons.

**Don't** introduce a second shade of the accent, a pastel tint of it, or a success green and
warning orange. Hue is spent on the accent.

### A colour per item

Some things are told apart by colour: projects, categories, people, the pads of a filter bar. A
Scope gives what's inside it an accent of its own, and it's the same engine run on that colour:
its lit caps, glow and LEDs are derived and held to AA exactly as the main accent's are, so a bright
yellow comes out amber. Inside a Scope the two jobs above are the same two jobs, in that colour.

An item's colour says **which one**, never **how it is**. A red project is fine; a red for
"failed" is the second hue this page rules out.

## State without hue

Because hue is spent, state is carried by **luminance, shape and words**. An error banner and an
info banner differ by their LED's shape and their LCD tag ("ERROR", "INFO"), not by being red and
blue. Every shipped seed is tested under color-blindness simulation to prove states stay apart.

This isn't a restriction worked around; it's why Echo works for people who can't tell red from
green, and in Windows High Contrast, where colors are replaced anyway.

**Don't** show a state with color alone. If you removed the color, the state should still be there.

### Destructive actions

A delete button and a save button share the accent, so danger is carried the same way as every
other state: by how the action happens, not by a red.

- **Nothing destructive happens on one press.** It goes through an AlertDialog that asks.
- **The words name the consequence.** "Delete 3 projects", not "OK". The dialog says what can't
  be undone.
- **Cancel comes first**, so a reflexive Enter never confirms.
- **The confirm cap is the deep end of your accent ramp**, and the dialog opens with the one
  rough sound (`caution`).

**Don't** add a red for danger. It would be the second hue this page rules out, and it would still
fail the people who can't see it.

## Motion is physics

A key goes down when you press it and comes back when you let go. Echo animates what a real part
would do, and nothing it wouldn't.

- **Controls acknowledge you** quickly and quietly: a press, a tick, a swap.
- **Things arrive and leave** with a little more time: a panel is summoned, a chip pops in.
- **Glass and light move smoothly; pixels move in steps.** An LCD never eases like a sheet of glass.

When someone asks their system for reduced motion, movement collapses to a fade or stops, and it
isn't brought back "just this once".

**Don't** animate for decoration, or invent a duration. Every timing is a token, because scattered
numbers are how a motion system falls apart.

## Sound is feedback, never information

Echo sounds like a device, not an instrument: short synthesized clicks and chirps, quieter than
you'd expect. A sound confirms something you can already see. It never carries anything you'd miss
without it.

- Sound is easy to turn off, and stays off: the choice is remembered.
- It goes quiet when the tab is in the background.
- It's silent when the system asks for reduced motion (`muteOnReducedMotion`, on by default).

**Don't** use sound as the only signal for anything: an error, a completed task, a new message.

## Accessibility is part of the grammar

Echo guarantees WCAG 2.2 AA. It isn't a goal or a checklist item; it's locked like the light is.
When accessibility and the look disagree, accessibility wins.

- **Contrast holds for any seed.** The theme engine corrects text against every surface it can
  sit on, so no accent you pick can make text unreadable.
- **Small text reads, not only passes.** The WCAG 2 ratio overrates bright colour on a dark ground,
  so on a dark device lit text is lifted until a small label reads at APCA Lc 60, and a cap always
  stands off the body it sits on. `style check` says what's still under comfortable, and what
  changes for people with colour blindness.
- **Focus is always visible**, including in Windows High Contrast, where the look's shadows are
  gone.
- **State survives forced colors.** Controls redraw their state in system colors, so an "on"
  switch or a selected option is still visible in Windows High Contrast.
- **Every target is at least 24×24px**, even when it looks smaller.
- **The accessible way is the easy way.** Components are built so the correct use is the obvious
  one.

**Don't** turn off focus rings, override contrast, or shrink a target to make a layout fit. If the
design needs that, the design is wrong.

## Dark or light: the chassis decides

Echo is one device, molded in dark plastic or light, and the chassis decides which. There's no
switch and no setting of its own: a pale chassis makes a light device, a white calculator or a
cream radio, and a dark one makes a dark device. The same key light falls on both, and every
material keeps its job.

- **A dark device** has lit screens: dark glass whose readouts glow, in the dark room a glow needs.
- **A light device** has screens of paper glass printed in ink, because a glow on a pale body is a
  smudge. What's lit is still the accent: an LED, the current rail, held to 3:1 on the pale
  plastic, so on is brighter than off. The text it prints, on a readout or a current tab, and the
  focus ring are the accent's ink, a step deeper. The primary cap is the same cap as on a dark device, the
  accent with a light label. The page's ground is the body barely set in, so the page is light;
  shadows are the body's own colour, deep, not grey; and a cap keeps its bevel through its shaded
  side: its lit rim stops short of white.

A dark screen on a light body, or a pale one on a dark body, is the one mix Echo refuses: one text
colour can't be readable on both, and the theme says so rather than shipping text that fails. On a
dark device, a screen's glass can still be reflective: paper printed in ink, like a pocket
calculator's, which needs no dark room and never glows.

## What you can change

**Your seed:**

| Setting | What it changes |
| --- | --- |
| `accent` | The one color: lit caps, LEDs, screens, the rail |
| `chassis` | The body the device is molded from, and so whether it's a dark device or a light one |
| `paper` | The ivory everything is written in |
| `lcdTint` | The glass of the screens (derived from the chassis if you leave it) |
| Typefaces | The machine voice, body text, mono, and the screen face |

**Your device's shape and feel:**

| Setting | What it changes | What it can't do |
| --- | --- | --- |
| **Radius** | How rounded the molding is, from crisp to soft; at its softest (1), buttons and segments are pills | Make a cap and a well indistinguishable |
| **Density** | How tightly parts are packed | Take any target under 24×24px |
| **Material finish** | What the plastic feels like, from matte to glossy | Move the light, or make state depend on shadow alone |
| **Molding** | Crisp, or soft: rounder, fuller caps with a pillow of light (a Scope's `molding`) | Change what a cap is for, or hide which one is pressed |
| **Screens** | On a dark device, emissive (dark glass that glows) or reflective (the paper glass of a pocket calculator, printed in ink), per screen; a light device's are paper glass | Drop below AA: reflective ink is checked on its glass like any text |

**What you can't change:** the single key light, what each material is for, the accent's two
jobs, state without hue, motion as physics, sound as feedback, and the accessibility guarantee.
That's the grammar. Two products built with Echo should look like two different devices from the
same maker.

## What a component accepts

Echo components are **closed**. They do not take `className`, they do not take `style`, and they
do not spread arbitrary DOM attributes. A component's props are the ones it documents, and that is
the whole list.

The reason is the same one behind everything above: the proposition is that an Echo component
already looks and feels right. `className` is how that erodes — one override at a time, in
someone else's repo, where nobody here can see it happening. A library that can be restyled
per-instance is a library with no feel, and feel is the entire point.

Closed does not mean sealed. A control has to go in a form, and the props that do that are
plumbing, not design — `onBlur` does not let anyone defeat the look, it lets them validate a
field. Refusing them would not protect anything; it would just make Echo unusable with
`react-hook-form`, which is what most people reach for first. So every control accepts a declared
interop set, and that set is part of the public API:

| Where | Which props |
| --- | --- |
| **Every control** | `ref`, `id`, `name`, `disabled`, `required`, `readOnly`, `autoFocus`, `onBlur`, `onFocus`, `aria-*`, `data-*` |
| **Text inputs, as well** | `autoComplete`, `inputMode`, `maxLength`, `minLength`, `pattern` |
| **Nothing, ever** | `className`, `style`, or a spread of arbitrary HTML attributes |

`data-*` is on the accept list deliberately. Blocking `data-testid` does not make anyone write
better selectors — it makes Echo hostile to their test suite, and they reach for a brittle CSS
selector instead.

**Applying it to a new component:** start from nothing and add what the component needs. If a prop
changes how the component *looks*, it belongs in the seed or nowhere. If it lets the component be
*used* — focused, labelled, validated, submitted, found by a test — it belongs in the interop set,
on every control that could want it, not just the one you are writing.

## Depth over count

Echo ships a component only when every state is handled: disabled, loading, error, focus, reduced
motion, forced colors. It would rather have fewer parts that are finished than a long list of
parts that look right in a screenshot.

---

## Decisions

The choices this page rests on where more than one answer was reasonable. The site renders
everything above this section; this part stays with the source.

1. **The key light is grammar**, fixed at 145°. It leaves the seed: products don't turn it.
2. **Material finish is a range from matte to glossy**, not a set of named plastics.
3. **Density has three steps:** compact, default, comfortable. It scales every control height and
   all spacing at once (decision 11 says how that differs from size).
4. **Glass is the fifth material**, for things that arrive and leave.
5. **The date picker** is the public example of the aesthetic gate: it waited until it could be made
   from Echo's materials.
6. **The docs voice** stays: opinionated, with "don't" lines.

These three are easy to reverse:

7. **Destructive actions use shape, wording and a confirm step, never a second hue** (the section
   above). It's what AlertDialog already does; a restricted red would break "one accent".
8. **Icons: Echo draws its own component glyphs and recommends Lucide for yours.** Icon size
   tokens make the two agree; an Echo icon set can come later if the machine voice needs it.
9. **Typefaces stay system stacks for launch.** Faces are already the user's choice (the seed);
   choosing one for Echo means licensing and font loading that nothing at launch needs.

10. **Components are closed, with a declared interop set** (the section above). The form controls,
    the ones that need to reach a form library, take the same declared set as everything else.

    Reversing this is not symmetric: opening a closed prop later is additive, and closing an open
    one later breaks people's code.

11. **One size scale, and size is not density.** Everything with a height takes `size: "sm" | "md" | "lg"`, mapped to the three
    control heights (32, 44 and 60px at default density), and a button's height includes its well.
    So a button, a field and a select of the same size are the same height, and an inline form
    lines up. `md` is the default; `lg` is for the one action a screen is built around; `sm` is
    for toolbars, table rows and filter bars. A `SizeProvider` sets it for a region. Size is per
    instance ("this toolbar is dense"); density is global ("this product is an admin tool") and
    scales all three steps. A target never goes under 24px: the hit area of a button is the whole
    button, well included, and on a touch screen `sm` grows to 44px.

12. **A colour per item, soft molding and reflective screens are vocabulary.** A product may give parts an accent of their own for identity, mold its caps softer,
    and give a screen reflective glass. Each is derived or checked by the same rules as the rest:
    an item's accent through the theme engine, reflective ink against its glass. None of them
    carries state, and the key light, the materials' jobs and the AA floor don't move.
