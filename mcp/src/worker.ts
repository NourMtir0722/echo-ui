/**
 * The hosted server: a Cloudflare Worker at HOSTED_MCP_URL (`wrangler.jsonc`
 * beside this package's package.json binds the host).
 *
 * - `/mcp`: the MCP server, over HTTP (`http.ts`).
 * - `/.well-known/openai-apps-challenge`: the token OpenAI's plugin portal asks
 *   a server to serve, to show the domain is ours. It's served to anyone, so it
 *   isn't a secret; it lives in `wrangler.jsonc` once the portal has issued it.
 * - `/`: one line saying what this is, for whoever opens it in a browser.
 *
 * Nothing here logs a request's body. People's code passes through
 * check_code, and Echo's privacy policy says none of it is kept.
 *
 * CORS is open. Everything served here is public, there's no sign-in or
 * cookie another origin could borrow, and the builders that run in a browser
 * call the server from their own pages.
 */
import { HOSTED_MCP_URL, REGISTRY_HOMEPAGE } from "@registry/agent/guidance";

import { MAX_BODY, createHttpHandler, readBounded, tooLarge } from "./http";

/** Cloudflare's rate-limiting binding: the part of its API this uses. */
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /** Declared in wrangler.jsonc. Absent in tests and in a dev run without it. */
  LIMITER?: RateLimit;
  /** The budget for large bodies, a unit per LARGE_UNIT (wrangler.jsonc). */
  LARGE?: RateLimit;
  /** OpenAI's domain token, once the plugin portal has issued it. */
  OPENAI_APPS_CHALLENGE?: string;
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept, authorization, mcp-protocol-version, mcp-session-id, last-event-id",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(CORS)) out.headers.set(name, value);
  return out;
}

/**
 * What a call costs is the code it carries: the largest check_code is about a hundred times the CPU of
 * a search, so counting requests alone left one address free to run the bill up with the largest bodies.
 * Each whole LARGE_UNIT of a body is a unit of the LARGE budget, so a call under it, which is nearly
 * every call, never draws on it.
 */
export const LARGE_UNIT = 16 * 1024;

const tooMany = (message: string, seconds: number) =>
  withCors(Response.json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }, { status: 429, headers: { "Retry-After": String(seconds) } }));

const plain = (body: string, status = 200, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } });

export function createWorker(handle: (request: Request) => Promise<Response>) {
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const { pathname } = new URL(request.url);

      if (pathname === "/.well-known/openai-apps-challenge") {
        return env.OPENAI_APPS_CHALLENGE ? plain(env.OPENAI_APPS_CHALLENGE) : plain("Not found.", 404);
      }
      if (pathname === "/") {
        return plain(`Echo UI's MCP server. Connect an MCP client to ${HOSTED_MCP_URL}. How: ${REGISTRY_HOMEPAGE}/docs/mcp\n`);
      }
      if (pathname !== "/mcp") return plain("Not found.", 404);

      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

      // A limit per address catches a runaway script. ChatGPT and Claude call
      // from their own servers, so one of their addresses can carry many people
      // at once: the ceiling in wrangler.jsonc is set far above what one
      // conversation sends, for that reason.
      const address = request.headers.get("cf-connecting-ip") ?? "unknown";
      if (env.LIMITER && !(await env.LIMITER.limit({ key: address })).success) {
        return tooMany("Too many requests from this address. Try again in a few seconds.", 10);
      }

      // Large bodies, by what they carry. Counted as read, so a body sent without a length is counted too.
      if (env.LARGE && request.method === "POST") {
        const body = await readBounded(request, MAX_BODY);
        if (!body) return withCors(tooLarge());
        for (let unit = 0; unit < Math.floor(body.byteLength / LARGE_UNIT); unit++) {
          if (!(await env.LARGE.limit({ key: address })).success) {
            return tooMany("Too much large code from this address in the last minute. Try again in a minute, or check the file in smaller parts.", 60);
          }
        }
        request = new Request(request.url, { method: "POST", headers: request.headers, body });
      }

      return withCors(await handle(request));
    },
  };
}

// Made once per isolate, so its catalog and registry caches serve every
// request the isolate takes.
export default createWorker(createHttpHandler());
