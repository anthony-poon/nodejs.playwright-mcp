# nodejs-playwright-mcp

A Node.js application that bridges a [Playwright MCP](https://github.com/microsoft/playwright-mcp) server with LLM providers (OpenAI, Arlia), enabling an AI agent to control a browser via tool calls.

## What it does

The app connects to a running Playwright MCP server, registers its tools with an LLM, and runs a conversation loop where the LLM can invoke browser automation tools. The loop continues until the model signals it is done (`finish_reason: stop`).

## Architecture

```
LLM Provider (OpenAI)
       ↕
  ChatService          ← manages conversation history and maps finish_reason to ConversationResult
       ↕
  QueueExecutor        ← serial command queue
  ┌─────────────────────────────────────┐
  │  ConversationHandler                │ ← sends message to LLM, pushes ToolExecutionCommand on tool_calls
  │  ToolExecutionHandler               │ ← checks permissions, executes tools, loops back to LLM
  └─────────────────────────────────────┘
       ↕
  ToolService          ← namespaced registry of tools and handlers
       ↕
  PlaywrightClient     ← raw MCP HTTP client (manual, not SDK Client)
```

## Key design decisions

### Manual MCP client (no SDK Client)

`PlaywrightClient` implements the MCP 2025-11-25 spec manually using Axios rather than the `@modelcontextprotocol/sdk` `Client` class. This was a deliberate choice for learning and visibility into the transport layer — the SDK types (`Tool`, `CallToolResult`, etc.) are still used for type safety.

The client handles: initialize handshake, `MCP-Session-Id` capture, SSE vs plain JSON response disambiguation, and JSON-RPC id correlation. Importantly, `PlaywrightClient` is an abstraction boundary: nothing above it (`ToolService`, handlers, use cases) knows about MCP or HTTP.

### Pluggable LLM provider

There are two layers: a thin client (`OpenAIClient`) that is a 1-to-1 mapping to the HTTP API, and a provider (`OpenAIProvider`) that implements the `LLMProvider` interface and adds logic (model capability mapping, response normalisation). `ChatService` only knows `LLMProvider` — swapping providers requires no changes to services or use cases.

### Snapshot drift detection

On startup, `SnapshotService` writes live server state (LLM model list, Playwright tool list) to `var/snapshots/`. It then asserts that committed baseline files in `src/services/tools/playwright/snapshots/` match the live output. The app refuses to start if they diverge, preventing silent schema drift between the committed tool definitions and the running server.

## Running

**1. Start the Playwright MCP server**

```bash
./playwright/run.sh
```

This starts the MCP server on `http://localhost:8931` using the config in `playwright/config.json`. A Docker alternative is also available (commented out in the script).

**2. Run a command**
Context file is needed for some use cases. It is for providing instruction and prompt

[Example](var/context/research_context_berlin_weather.example.json)

```bash
npm start -- <command> -c <context.json>
```

Available commands:

| Command           | Description                                        |
|-------------------|----------------------------------------------------|
| `hello-world`     | Simple LLM conversation test (no tools)            |
| `hello-world-not` | Prompt injection resistance test                   |
| `tool-call-test`  | Simple tool call test                              |
| `web-search`      | LLM-driven browser automation via Playwright tools |

Configure provider and keys via environment variables (see `src/config.ts`).
