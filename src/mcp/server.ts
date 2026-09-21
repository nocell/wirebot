import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  createMcpHandler,
  hostHeaderValidationResponse,
  type McpHttpHandler,
  McpServer,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { errorMessage } from "../shared/errors.js";
import type { Logger } from "../shared/logger.js";
import { wirebotVersion } from "../shared/version.js";

const turnMetadata = z.object({ thread_id: z.string().min(1), turn_id: z.string().min(1) });
const maxRequestBytes = 32 * 1_024;

/** Private MCP endpoint owned by the engine, using the 2026-07-28 stateless protocol. */
export class WirebotMcpServer {
  #server: ReturnType<typeof Bun.serve> | undefined;
  readonly #handler: McpHttpHandler;
  readonly #token = randomBytes(32).toString("base64url");

  public constructor(
    react: (threadId: string, turnId: string, reaction: string) => Promise<void>,
    logger: Logger,
  ) {
    this.#handler = createMcpHandler(
      () => {
        const server = new McpServer(
          { name: "wirebot", version: wirebotVersion },
          { supportedProtocolVersions: ["2026-07-28"] },
        );
        server.registerTool(
          "react_to_last_message",
          {
            description: "React to this turn's message with an emoji or :shortcode:.",
            inputSchema: z.strictObject({ reaction: z.string().trim().min(1).max(128) }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
          },
          async ({ reaction }, context) => {
            const parsed = turnMetadata.safeParse(context.mcpReq._meta?.["x-codex-turn-metadata"]);
            try {
              if (!parsed.success)
                throw new Error("This tool requires Codex thread and turn metadata.");
              await react(parsed.data.thread_id, parsed.data.turn_id, reaction);
              return { content: [{ type: "text", text: "Reaction set." }] };
            } catch (error) {
              return { isError: true, content: [{ type: "text", text: errorMessage(error) }] };
            }
          },
        );
        return server;
      },
      {
        legacy: "reject",
        onerror: (error) => logger.debug("MCP request rejected", { error: errorMessage(error) }),
      },
    );
  }

  public start(): { readonly url: string; readonly token: string } {
    const authorization = Buffer.from(`Bearer ${this.#token}`);
    this.#server ??= Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      maxRequestBodySize: maxRequestBytes,
      fetch: (request) => {
        const rejected =
          hostHeaderValidationResponse(request, ["127.0.0.1"]) ??
          originValidationResponse(request, []);
        if (rejected !== undefined) return rejected;
        if (new URL(request.url).pathname !== "/mcp") return new Response(null, { status: 404 });
        const supplied = Buffer.from(request.headers.get("authorization") ?? "");
        if (supplied.length !== authorization.length || !timingSafeEqual(supplied, authorization)) {
          return new Response(null, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
        }
        return this.#handler.fetch(request);
      },
    });
    return { url: `http://127.0.0.1:${this.#server.port}/mcp`, token: this.#token };
  }

  public async stop(): Promise<void> {
    await this.#handler.close();
    await this.#server?.stop(true);
    this.#server = undefined;
  }
}
