/**
 * What a keypad holds, as numbers. Pure: no React, no DOM.
 *
 * A keypad holds the digits typed, in order. An amount fills from the right,
 * the way a till does: typing 1, 2, 4, 0 with two decimals reads 12.40, so
 * nobody ever has to find a decimal point.
 */

export type KeypadMode = "amount" | "pin" | "digits";

/**
 * The digits a value holds. A PIN or a code is its digits as written. An
 * amount is read as a number and given exactly `decimals` places, so it
 * doesn't matter how it was written: "12.4", "12.40" and String(12.4) are all
 * "1240" with two decimals, "12" is "1200", and "0.05" is "5". Places past the
 * pad's are cut, the way a till can't hold them.
 */
export function digitsOf(value: string, mode: KeypadMode, decimals = 2): string {
  if (mode !== "amount") return value.replace(/\D/g, "");
  const [whole = "", fraction = ""] = value.replace(/[^\d.]/g, "").split(".");
  const cents = decimals > 0 ? fraction.slice(0, decimals).padEnd(decimals, "0") : "";
  return `${whole}${cents}`.replace(/^0+/, "");
}

/** The value typed digits make: "1240" → "12.40" for an amount with two decimals. */
export function valueOf(digits: string, mode: KeypadMode, decimals: number): string {
  if (mode !== "amount" || digits === "") return digits;
  if (decimals === 0) return digits;
  const padded = digits.padStart(decimals + 1, "0");
  return `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
}

/**
 * Type one key. An amount never starts with a zero (0 then 5 is just 5) and
 * stops at `max` digits; a PIN or a code stops at its length.
 */
export function press(digits: string, key: string, mode: KeypadMode, max: number): string {
  if (key === "delete") return digits.slice(0, -1);
  let next = digits;
  for (const d of key) {
    if (!/\d/.test(d) || next.length >= max) break;
    if (mode === "amount" && next === "" && d === "0") continue;
    next += d;
  }
  return next;
}
