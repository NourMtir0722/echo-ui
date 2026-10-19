/**
 * `pnpm --filter @echo-ui/supporters-api deploy:worker`: deploys the server,
 * once its Stripe secrets are stored as secrets.
 *
 * `wrangler deploy` replaces a Worker's variables with wrangler.jsonc's, so a
 * key added in the Worker's settings as text is erased by the next deploy, and
 * the thank-you page can't check a payment until someone notices.
 * Secrets survive a deploy. This asks Cloudflare which secrets the Worker has
 * (their names only, never a value) and deploys only when every one it
 * needs is there.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** The secrets the server can't work without: reading Stripe, knowing it's Stripe calling, and knowing whose payment it is. */
export const NEEDED = ["STRIPE_KEY", "STRIPE_WEBHOOK_SECRET", "SUPPORTER_SALT"];

/** Which of them `wrangler secret list` doesn't name. */
export function missing(list: unknown): string[] {
  const names = Array.isArray(list) ? list.map((s) => (s && typeof s === "object" ? (s as { name?: unknown }).name : undefined)) : [];
  return NEEDED.filter((n) => !names.includes(n));
}

function main() {
  const here = fileURLToPath(new URL("..", import.meta.url));
  const out = execFileSync("npx", ["wrangler", "secret", "list", "--format", "json"], { cwd: here, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const gone = missing(JSON.parse(out.slice(out.indexOf("["))));
  if (gone.length) {
    console.error(
      `Not deploying: ${gone.join(" and ")} must be stored on the Worker as ${gone.length > 1 ? "secrets" : "a secret"} first.\n` +
        "Workers & Pages → echo-ui-supporters → Settings → Variables and Secrets → Add, type Secret\n" +
        "(or `npx wrangler secret put <name>` here), then deploy again.",
    );
    process.exit(1);
  }
  execFileSync("npx", ["wrangler", "deploy"], { cwd: here, stdio: "inherit" });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
