/**
 * Printing, in one place.
 *
 * Every command has to work for a person reading a terminal and for an agent
 * reading `--json`, so nothing prints directly: commands hand back a result,
 * and this decides how it is shown. Colour is opt-out through NO_COLOR and off
 * when the output isn't a terminal.
 */
const useColour = process.stdout.isTTY === true && !process.env.NO_COLOR;

const paint = (code: string) => (text: string) => (useColour ? `[${code}m${text}[0m` : text);

export const dim = paint("2");
export const bold = paint("1");
export const accent = paint("35");
export const red = paint("31");
export const green = paint("32");

export interface Reporter {
  json: boolean;
  line(text?: string): void;
  step(text: string): void;
  warn(text: string): void;
  error(text: string): void;
  result(value: unknown): void;
}

export function reporter(json: boolean): Reporter {
  return {
    json,
    line(text = "") {
      if (!json) console.log(text);
    },
    step(text) {
      if (!json) console.log(`${accent("·")} ${text}`);
    },
    warn(text) {
      if (!json) console.warn(`${bold("!")} ${text}`);
    },
    error(text) {
      // Errors go to stderr in both modes: a --json caller still needs to see
      // what went wrong, and stdout has to stay parseable.
      console.error(json ? JSON.stringify({ ok: false, error: text }) : `${bold("✗")} ${text}`);
    },
    result(value) {
      if (json) console.log(JSON.stringify({ ok: true, ...(value as object) }, null, 2));
    },
  };
}
