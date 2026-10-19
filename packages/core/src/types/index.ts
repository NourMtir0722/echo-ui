import type * as React from "react";

/**
 * Echo's names for the types that appear in Echo's public prop types.
 *
 * Nine components used to put `BaseX.Root.ChangeEventDetails` straight into a
 * signature a consumer writes against, which made Echo's public API a
 * downstream of Base UI's internals: a rename upstream is, by CHANGELOG.md's
 * own definition ("a prop … changed"), a BREAKING Echo release triggered by
 * somebody else's refactor. It was also inconsistent — only nine of roughly
 * twenty Base-UI-backed components did it, so the same callback shape meant
 * different things on different components.
 *
 * Passing the details through is genuinely useful: it is how a caller inspects
 * the originating event or cancels the change. The problem was only ever the
 * NAME. So these are structural subsets of what Base UI passes, which means
 * the real object still arrives at runtime — nothing is wrapped or copied —
 * while the type a consumer writes against belongs to Echo.
 *
 * Adding a field here is safe. Removing one is breaking, the same as any prop.
 */

/** What every Echo change event carries. */
export interface EchoChangeEvent {
  /** Why the value changed — `"keyboard"`, `"trigger-press"`, and so on. */
  reason: string;
  /** The native event behind it. */
  event: Event;
  /** Stop Echo handling this event, leaving the value where it was. */
  cancel: () => void;
  /** Let the event propagate where it would otherwise be stopped. */
  allowPropagation: () => void;
  isCanceled: boolean;
  isPropagationAllowed: boolean;
  /** The element that started it, when there is one. */
  trigger: Element | undefined;
}

/** Slider also says which thumb moved. */
export interface EchoSliderChangeEvent extends EchoChangeEvent {
  activeThumbIndex: number;
}

/** NumberField also says which way, when a step caused the change. */
export interface EchoNumberFieldChangeEvent extends EchoChangeEvent {
  direction?: -1 | 1 | undefined;
}

/**
 * Overlays that animate out. `preventUnmountOnClose()` holds the node mounted
 * so an exit tween can finish — the same contract `useGsapPresence` depends
 * on, and the reason its exit survives at all.
 */
export interface EchoDismissEvent extends EchoChangeEvent {
  preventUnmountOnClose: () => void;
}

/**
 * Where a popup mounts. Defaults to `<body>`; pass an element inside a scoped
 * theme and the popup wears that theme too.
 *
 * Restated rather than borrowed from the portal component it is handed to, for
 * the same reason as the events above: it is a prop a consumer writes against,
 * so it should be Echo's to name.
 */
export type EchoPortalContainer =
  | HTMLElement
  | ShadowRoot
  | null
  | React.RefObject<HTMLElement | ShadowRoot | null>;

/**
 * The interop set every Echo control accepts (`PRINCIPLES.md`, "What a
 * component accepts").
 *
 * Echo's components are closed: no `className`, no `style`, no spread of
 * arbitrary HTML attributes. That is what keeps an Echo control feeling like
 * an Echo control. But a control also has to go IN something — a form, a test,
 * a label — and the props that do that are plumbing rather than design.
 * `onBlur` does not let anyone defeat the look; it lets them validate a field.
 * Refusing it protected nothing and made Echo unusable with `react-hook-form`,
 * which is what most people reach for first.
 *
 * It lives here rather than being restated in 49 copied files for the same
 * reason the event types do: it is one decision, and a control that quietly
 * accepts a different set is the incoherence this exists to prevent.
 *
 * `ref` is deliberately NOT here. It cannot be: on React 18 a function
 * component never receives `ref` through props — React strips it before the
 * component runs — so a control has to be wrapped in `forwardRef` to take one,
 * and a type cannot express that. Declaring `ref` as an ordinary prop compiles
 * under both majors, works on 19 and is silently inert on 18.
 */
export interface EchoInterop extends React.AriaAttributes {
  /** The element's id, so a `<label for>` or an `aria-describedby` can reach it. */
  id?: string;
  /** The field's name in a form submission, and the key `react-hook-form` registers. */
  name?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** Fired on focus loss. `react-hook-form` validates `onTouched` and `onBlur` with it. */
  onBlur?: React.FocusEventHandler<Element>;
  onFocus?: React.FocusEventHandler<Element>;
  /**
   * Keyboard handling the caller owns — Enter to send, Escape to clear.
   *
   * An addition to the interop set, on the set's own reasoning: this is plumbing, not
   * design. Echo's own `chat` template needs Enter-to-send, which is as good
   * a demonstration as exists that refusing it protects nothing.
   */
  onKeyDown?: React.KeyboardEventHandler<Element>;
  /**
   * Any `data-*` attribute, passed to the element.
   *
   * Allowed deliberately, reversing an earlier position that blocking
   * `data-testid` was "arguably a feature". Blocking it does not make anyone
   * write better selectors — it makes Echo hostile to their test suite, and
   * they reach for a brittle CSS selector instead.
   */
  [dataAttribute: `data-${string}`]: unknown;
}

/**
 * What a BUTTON accepts on top of the above.
 *
 * A button with no `onClick` is an ornament, and `type="submit"` is how a
 * control joins a form — both are plumbing by the same test. `name` and
 * `value` are inherited and meaningful here too: a submit button can carry
 * which action was chosen.
 *
 * `required` and `readOnly` come along from `EchoInterop` and mean nothing on
 * a button. That is the price of one shared base, and it is cheaper than a
 * second vocabulary nobody can remember.
 */
export interface EchoPressInterop extends EchoInterop {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** "button" (default), "submit" or "reset". */
  type?: "button" | "submit" | "reset";
  /** The id of the form this button submits, when it sits outside it. */
  form?: string;
  /** Submitted with the form when this button is the one pressed. */
  value?: string;
  /** The browser's own hover tooltip. Never the accessible name. */
  title?: string;
  /**
   * Press handlers, chained BEFORE Echo's own tactile ones.
   *
   * On the interop list because Echo is a library about how a press feels: a
   * press library that will not let you hook pointer-down is refusing the one
   * thing it is about. Echo's own audition bench plays each sound on
   * `onPointerDown` rather than `onClick`, "so the sound lands with the
   * finger, the way every other Echo press does" — which is the argument.
   */
  onPointerDown?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerUp?: React.PointerEventHandler<HTMLButtonElement>;
}

/**
 * What a control you TYPE into accepts on top of the above: the attributes
 * that tell a browser and a phone what kind of text this is.
 */
export interface EchoTextInterop extends EchoInterop {
  /** The greyed hint shown while the field is empty. Never a substitute for a label. */
  placeholder?: string;
  /**
   * What the value is, for autofill and assistive tech — "email",
   * "current-password", "one-time-code". WCAG 1.3.5 asks for it on any field
   * collecting the user's own information.
   */
  autoComplete?: string;
  /** Which on-screen keyboard a phone offers: "numeric", "email", "tel", … */
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  maxLength?: number;
  minLength?: number;
  /** A regular expression the value must match for the field to be valid. */
  pattern?: string;
}

/**
 * Echo's one status vocabulary.
 *
 * `tone` used to mean three unrelated things: semantic status on `Banner`,
 * activity state on `Toast` (`"default" | "active"`), and a colour choice on
 * `CountBadge` (`"accent" | "neutral"`). Learning `tone` on one component
 * taught you nothing about the next, and `Toast`'s `"active"` and `Banner`'s
 * `"active"` were not the same idea.
 *
 * So there is one list, here, and `tone` means this everywhere:
 *
 * - `info` — the neutral default. Something is true.
 * - `active` — something is happening NOW. Live, running, recording.
 * - `warn` — something needs attention before it becomes a problem.
 * - `danger` — something is wrong.
 *
 * A component may implement a SUBSET, the way `size` is `"sm" | "md" | "lg"`
 * on some components and `"sm" | "md"` on others. What it may not do is mean
 * something else by the same word.
 *
 * `tone` is what a thing MEANS. `variant` is what it is made of — that split
 * is sound and already consistent (`PanelVariant`, `SkeletonVariant`,
 * `HardwareButtonVariant`), which is why `CountBadge`'s colour choice became a
 * `variant` rather than staying a `tone`.
 */
export type EchoTone = "info" | "active" | "warn" | "danger";
