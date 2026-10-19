/**
 * Prop extraction for the agent layer. Every meta.ts carries a
 * zod prop schema; until now nothing read it, so the catalog could tell an
 * agent what a component IS but not what it TAKES — and the examples had to
 * carry the whole API by implication.
 *
 * This walks a meta's ZodObject one level deep and renders each prop as a flat
 * row an agent can read: name, a short type string, required-ness, default, and
 * the .describe() text. It is deliberately NOT a JSON Schema emitter — nested
 * schema for a ReactNode or an event handler says nothing useful, and the
 * consumer here is a model reading a table, not a validator.
 *
 * Pure and dependency-free (zod is a build-time devDep, and only `.shape`,
 * `.description` and `_zod.def`, the definition zod 4 exposes to code that
 * reads schemas, are touched here).
 */

/** The zod internals this walker needs, narrowed so no zod types leak out. */
interface ZodLike {
  _zod: {
    def: {
      /** The kind: "string", "optional", "default", … */
      type: string;
      innerType?: ZodLike;
      /** An array's item. */
      element?: ZodLike;
      options?: ZodLike[];
      /** An enum's members, keyed by name. */
      entries?: Record<string, string | number>;
      /** A literal's values (one, unless `z.literal([…])`). */
      values?: readonly unknown[];
      valueType?: ZodLike;
      /** A default's value: zod 4 stores the value, not a factory. */
      defaultValue?: unknown;
    };
  };
  description?: string;
  shape?: Record<string, ZodLike>;
}

export interface CatalogProp {
  name: string;
  /** Short, human type string — "boolean", '"sm" | "md" | "lg"', "function". */
  type: string;
  required: boolean;
  /** Literal default, rendered as source (e.g. `"md"`, `false`). */
  defaultValue?: string;
  description?: string;
}

/** Render a value the way it would be written in the prop table. */
function literal(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * The short type string for a schema. Wrappers (optional/default/nullable) are
 * peeled off by describeProps before this is called, so this only sees the
 * value type itself.
 */
export function typeName(schema: ZodLike): string {
  const def = schema._zod.def;
  // Set by typed() for shapes zod cannot express (ReactNode, SoundBackend).
  const named = (def as { echoType?: unknown }).echoType;
  if (typeof named === "string") return named;
  switch (def.type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "enum":
      return Object.values(def.entries ?? {}).map((v) => JSON.stringify(v)).join(" | ") || "string";
    case "literal":
      return (def.values ?? []).map(literal).join(" | ");
    case "union":
      return (def.options ?? []).map(typeName).join(" | ");
    case "array":
      return def.element ? `${typeName(def.element)}[]` : "unknown[]";
    case "record":
      return def.valueType ? `Record<string, ${typeName(def.valueType)}>` : "Record<string, unknown>";
    case "function":
      return "function";
    case "object":
      return "object";
    // The metas use z.unknown() for anything React-shaped — a ReactNode, an
    // icon slot, a render prop. "unknown" is honest: the .describe() text is
    // what carries the meaning there.
    case "unknown":
    case "any":
      return "unknown";
    default:
      return "unknown";
  }
}

/**
 * Flatten a meta's prop schema into catalog rows.
 *
 * `.describe()` attaches to whichever wrapper it was called on — `z.boolean()
 * .default(false).describe("…")` puts it on the ZodDefault, while
 * `z.boolean().describe("…").default(false)` puts it on the ZodBoolean. Both
 * spellings appear across the metas, so the description is read from the
 * outermost wrapper inward and the first one found wins.
 */
export function describeProps(schema: unknown): CatalogProp[] {
  const shape = (schema as ZodLike | undefined)?.shape;
  if (!shape) return [];

  return Object.entries(shape).map(([name, raw]) => {
    let current: ZodLike = raw;
    let required = true;
    let defaultValue: string | undefined;
    let description: string | undefined = raw.description;

    // Peel the wrappers. A prop is optional if ANY wrapper makes it so.
    for (;;) {
      const def = current._zod.def;
      if (def.type === "optional" || def.type === "nullable") {
        required = false;
      } else if (def.type === "default") {
        required = false;
        defaultValue = literal(def.defaultValue);
      } else {
        break;
      }
      const inner = def.innerType;
      if (!inner) break;
      current = inner;
      description ??= current.description;
    }

    return {
      name,
      type: typeName(current),
      required,
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(description ? { description } : {}),
    };
  });
}
