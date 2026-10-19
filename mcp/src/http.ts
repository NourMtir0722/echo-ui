/**
 * The server over HTTP, for the hosts that only take a remote server: ChatGPT,
 * claude.ai, and the builders that run in a browser. The same tools the stdio
 * entry serves, made by the same `createServer`, so the two can't answer
 * differently.
 *
 * Stateless. Nothing a call needs outlives it except the caches in `sources`,
 * which are made once per process (in a Worker, once per isolate) and shared
 * by every request. Each request gets a server and a transport of its own:
 * the SDK requires that of a transport without sessions, and it costs a few
 * closures.
 *
 * Only POST carries MCP here. A GET asks for an event stream the server could
 * write to later, and without sessions nothing ever would, so it's answered
 * 405, which the transport's spec allows.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createServer, createSources, type ServerOptions, type ServerSources } from "./server";
import { MAX_CODE } from "./tools";

/**
 * The most a request body may be, in bytes: a check_code of MAX_CODE
 * characters with every one escaped at its longest (`\uXXXX`), and room for
 * the call around it. The transport reads a body whole and parses it before
 * any tool's schema sees it, so a ceiling in the schema alone left the
 * server reading whatever it was sent. This one is on the bytes,
 * before anything is parsed.
 */
export const MAX_BODY = 6 * MAX_CODE + 64 * 1024;

const refuse = (status: number, message: string, headers: Record<string, string> = {}) =>
  Response.json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }, { status, headers });

/** The body, or undefined once it's past `max`: reading stops there, so a body that never ends costs `max`. */
export async function readBounded(request: Request, max: number): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > max) {
    await request.body?.cancel().catch(() => {});
    return undefined;
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return undefined;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    body.set(chunk, at);
    at += chunk.byteLength;
  }
  return body;
}

/** The answer to a body past MAX_BODY, wherever it's found. */
export const tooLarge = () =>
  refuse(413, `Request too large: this server takes up to ${MAX_BODY.toLocaleString("en")} bytes, and check_code up to ${MAX_CODE.toLocaleString("en")} characters.`);

export function createHttpHandler(options: ServerOptions = {}, sources: ServerSources = createSources(options)) {
  return async function handle(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return refuse(405, "This server takes MCP over POST only: it keeps no sessions, so it has no stream to open.", { Allow: "POST" });
    }
    const body = await readBounded(request, MAX_BODY);
    if (!body) return tooLarge();
    const server = createServer(options, sources);
    // JSON replies rather than a stream: every tool answers in one piece, and
    // a whole body is what lets the server be closed as soon as it's sent.
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
      return await transport.handleRequest(new Request(request.url, { method: "POST", headers: request.headers, body }));
    } finally {
      await server.close();
    }
  };
}
