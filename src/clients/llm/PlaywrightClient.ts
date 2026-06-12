import { type AxiosInstance, AxiosRequestConfig } from "axios";
import type { Readable } from "node:stream";
import { withLogger } from "../../infra/logger";
import type {
  // Using SDK types for spec compliance, but intentionally NOT using the SDK's Client class.
  // Reasons:
  //   1. Learning — understanding the MCP wire protocol directly
  //   2. Control — custom SSE parsing, logging, session handling, and error recovery
  //   3. Axios — we reuse the shared httpClient (interceptors, auth headers, logging)
  // See: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
  InitializeRequest,
  InitializeResult,
  ListToolsResult,
  CallToolResult,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

export type { Tool };

export class PlaywrightClient {
  private readonly logger = withLogger("playwright-client");
  private session: string | null = null;
  private protocol: string | null = "2025-11-25";
  private requestId = 0;
  // Holding this so that it does not get garbage collected. Also need it to close stream
  private sse: Readable | null = null;

  constructor(
    private readonly client: AxiosInstance,
    private readonly baseUrl: string,
  ) {}

  private getOptions(): AxiosRequestConfig {
    return {
      headers: {
        "Content-Type": "application/json",
        // Per spec, client MUST list both content types — server decides which to use.
        // See: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server
        "Accept": "application/json, text/event-stream",
        ...(this.session ? { "MCP-Session-Id": this.session } : {}),
        ...(this.protocol ? { "MCP-Protocol-Version": this.protocol } : {}),
      },
      // Must be "text" — server may return either plain JSON or SSE (text/event-stream).
      // Axios's default "json" responseType would fail to parse SSE responses.
      responseType: "text",
    };
  }

  private nextId() {
    return ++this.requestId;
  }

  private async send<T>(method: string, params?: object): Promise<T> {
    if (!this.session) {
      await this.initialize();
    }

    const id = this.nextId();
    const res = await this.client.post(
      `${this.baseUrl}/mcp`,
      { jsonrpc: "2.0", id, method, params },
      this.getOptions()
    );
    const raw = res.data as string;

    // Server may respond with either plain JSON or an SSE stream (text/event-stream).
    // If SSE, there may be multiple events: notifications/requests before the actual
    // JSON-RPC response. We identify the response by matching on our request id,
    // since only responses carry the id back (notifications have no id).
    // See: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#sending-messages-to-the-server
    let parsed: { result?: T; error?: { message: string } };
    if (raw.includes("data:")) {
      const events = [...raw.matchAll(/^data:\s*(.+)$/gm)].map(m => JSON.parse(m[1]));
      parsed = events.find(e => e.id === id) ?? events[events.length - 1];
    } else {
      parsed = JSON.parse(raw);
    }

    if (parsed.error) {
      throw new Error(`MCP error on ${method}: ${parsed.error.message}`);
    }

    return parsed.result as T;
  }

  async initialize(): Promise<void> {
    this.logger.debug(`Handshaking with playwright MCP server at ${this.baseUrl}`);

    // Construct the initialize request using the SDK type for spec compliance.
    // protocolVersion is the version we want to negotiate — server must echo it back
    // or respond with a version it supports.
    const initRequest: Omit<InitializeRequest, "method"> = {
      params: {
        protocolVersion: this.protocol!,
        clientInfo: { name: "nodejs-playwright-mcp", version: "1.0.0" },
        capabilities: {},
      },
    };

    const res = await this.client.post(
      `${this.baseUrl}/mcp`,
      { jsonrpc: "2.0", id: this.nextId(), method: "initialize", ...initRequest },
      this.getOptions()
    );

    // MCP-Session-Id is returned on the InitializeResult response.
    // We treat its absence as a fatal error since Playwright MCP requires stateful sessions.
    // See: https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#session-management
    if (!res.headers["mcp-session-id"]) {
      throw new Error("Unable to initialize session: server did not return MCP-Session-Id");
    }
    this.session = res.headers["mcp-session-id"];

    const raw = res.data as string;
    const parsed = JSON.parse(raw.includes("data:") ? raw.match(/^data:\s*(.+)$/m)![1] : raw);
    const result: InitializeResult = parsed.result;

    // Adopt the protocol version the server negotiated back to us.
    this.protocol = result.protocolVersion;
    this.logger.debug({ protocolVersion: this.protocol }, `Session initialized for ${this.baseUrl}`);

    // notifications/initialized is a one-way notification (no id, no response expected).
    // This signals to the server we are ready to begin normal operations.
    // See: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle
    await this.client.post(
      `${this.baseUrl}/mcp`,
      { jsonrpc: "2.0", method: "notifications/initialized" },
      this.getOptions()
    );
    this.logger.debug("Handshake completed");
    this.heartbeat();
  }

  private disconnected = false;

  // Need to open, maintain a connection and response to the ping. Otherwise, the session will auto close in 5 sec
  private heartbeat(): void {
    if (this.disconnected) return;
    this.client.get(`${this.baseUrl}/mcp`, {
      headers: {
        "Accept": "text/event-stream",
        "MCP-Session-Id": this.session!,
      },
      responseType: "stream",
      timeout: 0,
    }).then((res) => {
      this.sse = res.data as Readable;
      let buf = "";
      this.sse.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop()!;
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const msg = JSON.parse(line.slice(5).trim());
            if (msg.method === "ping") {
              this.client.post(`${this.baseUrl}/mcp`,
                { jsonrpc: "2.0", id: msg.id, result: {} },
                this.getOptions()
              );
            }
          } catch {}
        }
      });
      this.sse.on("close", () => {
        if (this.disconnected) return;
        this.logger.debug("Heartbeat SSE stream closed, reconnecting");
        setTimeout(() => this.heartbeat(), 1000);
      });
    }).catch((err) => {
      if (this.disconnected) return;
      this.logger.debug({ err }, "Heartbeat SSE stream error, reconnecting");
      setTimeout(() => this.heartbeat(), 1000);
    });
  }

  disconnect(): void {
    this.disconnected = true;
    this.sse?.destroy();
    this.sse = null;
  }

  async listTools(): Promise<ListToolsResult> {
    this.logger.debug("Fetching tools list");
    return await this.send<ListToolsResult>("tools/list");
  }

  async callTool(name: string, args: object): Promise<CallToolResult> {
    this.logger.debug({ args }, `Calling tool: ${name}`);
    const result = await this.send<CallToolResult>("tools/call", {
      name,
      arguments: args,
    });

    if (result.isError) {
      throw new Error(`Tool error from ${name}: ${JSON.stringify(result.content)}`);
    }

    return result;
  }
}
