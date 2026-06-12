# nodejs-playwright-mcp

A Node.js application that bridges a [Playwright MCP](https://github.com/microsoft/playwright-mcp) server with LLM providers (OpenAI, Arlia), enabling an AI agent to control a browser via tool calls.

## What it does

The app connects to a running Playwright MCP server, registers its tools with an LLM, and runs a conversation loop where the LLM can invoke browser automation tools. The loop continues until the model signals it is done (`finish_reason: stop`).

## Architecture

```
LLM Provider (OpenAI / Arlia)
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

There are two layers: a thin client (`OpenAIClient`, `ArliaClient`) that is a 1-to-1 mapping to the HTTP API, and a provider (`OpenAIProvider`, `ArliaProvider`) that implements the `LLMProvider` interface and adds logic (model capability mapping, response normalisation). `ChatService` only knows `LLMProvider` — swapping providers requires no changes to services or use cases.

### Tool namespacing

Tools from multiple factories could collide on name (e.g. two factories both defining `browser_click`). `ToolService.create()` prepends the factory namespace with `_` as separator: `playwright_browser_click`. OpenAI rejects `:` in tool names — `_` is used throughout.

`ToolService.execute(toolId, args)` strips the namespace prefix to route to the right `ToolHandler` and pass the bare name to the underlying client.

### Command queue executor

`QueueExecutor` drains a queue serially. Handlers can push new commands during execution, enabling the LLM → tool call → tool result → LLM loop without recursion:

1. `ConversationCommand` → `ConversationHandler` calls the LLM. If `tool_calls`, pushes `ToolExecutionCommand`.
2. `ToolExecutionCommand` → `ToolExecutionHandler` executes each tool. On finish, pushes a new `ConversationCommand` (no message — loop-back with tool results).
3. Queue drains when `ConversationHandler` gets `finish_reason: stop`.

The serial, command-driven design decouples execution from I/O: `Presentation.prompt()` is async, so a blocking user confirmation doesn't require restructuring the loop — it's just another `await` inside a handler. This is what makes it feasible to swap `CliPresentation` for a WebSocket-backed implementation. The goal is to support a separate UI process (CLI or web) that communicates with this daemon over WebSocket, with the `Presentation` interface as the only thing that changes. An AMQP-backed queue is also an option down the line.

### Permission system

`Tool.isPermissionRequired` flags tools that need explicit user consent before execution. `ToolExecutionHandler` prompts the user via `Presentation.prompt()` and adds a denied tool result if the user says no. The blacklist (`browser_run_code_unsafe`) is filtered out entirely in `PlaywrightToolFactory` — those tools are never registered.

### Snapshot drift detection

On startup, `SnapshotService` writes live server state (LLM model list, Playwright tool list) to `var/snapshots/`. It then asserts that committed baseline files in `src/services/tools/playwright/snapshots/` match the live output. The app refuses to start if they diverge, preventing silent schema drift between the committed tool definitions and the running server.

## Project structure

```
src/
  clients/          # Raw HTTP clients (1-to-1 with external APIs)
  providers/        # LLMProvider implementations (business logic over clients)
  services/
    chats/          # ChatService + Chat conversation model
    tools/          # ToolService, Tool, PlaywrightToolFactory, PlaywrightToolHandler
    executors/      # QueueExecutor, Command, ConversationHandler, ToolExecutionHandler
    snapshots/      # Startup drift detection
  use-cases/        # Entry points (ToolCallTest)
  infra/            # Logger, HTTP client, Presentation
  config.ts
  app.ts            # DI container + error wrapper
  index.ts          # Entry point
```

## Running

**1. Start the Playwright MCP server**

```bash
./playwright/run.sh
```

This starts the MCP server on `http://localhost:8931` using the config in `playwright/config.json`. A Docker alternative is also available (commented out in the script).

**2. Run a command**

```bash
npm start -- run <command>
```

Available commands:

| Command           | Description                                        |
|-------------------|----------------------------------------------------|
| `hello-world`     | Simple LLM conversation test (no tools)            |
| `hello-world-not` | Prompt injection resistance test                   |
| `tool-call-test`  | LLM-driven browser automation via Playwright tools |

Configure provider and keys via environment variables (see `src/config.ts`).
