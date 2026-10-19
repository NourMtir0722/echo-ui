/**
 * The names of the interop props every control documents (interop.ts), as
 * plain data: the CLI bundles the renderer and has no business bundling zod.
 * `interop-names.test.ts` keeps this equal to the schemas.
 */
export const INTEROP_NAMES: ReadonlySet<string> = new Set([
  "id",
  "name",
  "disabled",
  "required",
  "readOnly",
  "autoFocus",
  "onBlur",
  "onFocus",
  "onKeyDown",
  "placeholder",
  "autoComplete",
  "inputMode",
  "maxLength",
  "minLength",
  "pattern",
  "onClick",
  "type",
  "form",
  "value",
  "title",
  "onPointerDown",
  "onPointerUp",
]);
