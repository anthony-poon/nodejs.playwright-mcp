# TODO: Streaming Output

## What
Stream LLM token output to the presentation layer as they arrive, instead of printing the full response only when the LLM is done.

## Possible Implementation

### 1. Add `stream()` to `LLMProvider`
```typescript
stream(request: ChatRequest): AsyncIterable<StreamChunk>

type StreamChunk =
  | { type: "token"; content: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "done"; finish_reason: string }
```

### 2. Add `print()` to `Presentation`
`println()` is for complete lines. Streaming needs a no-newline variant that flushes immediately:
```typescript
print(msg: string): void  // process.stdout.write(chunk) under the hood
```

### 3. Add `stream()` to `ChatService` as a separate method
Do NOT retrofit into the existing `conversation()` — keep the two paths separate and clean.
```typescript
public async stream(ctx: ChatContext, msg: string): Promise<void> {
  ctx.chat.addMessage(msg);
  for await (const chunk of this.provider.stream(request)) {
    if (chunk.type === "token") {
      this.presentation.print(chunk.content);
    }
    // handle tool_calls and done...
  }
}
```

## Problems

### Streaming + tool calls don't mix cleanly
When the LLM decides to call a tool mid-stream, it stops emitting tokens and switches to emitting a tool call instead. This means the streaming loop must:
1. Collect streamed tokens and print them
2. Detect a tool call chunk, pause streaming
3. Execute the tool
4. Start a **new** stream with the tool result appended to the conversation
5. Repeat until `finish_reason` is `stop`

This makes `stream()` significantly more complex than `conversation()`.

### Tool call arguments arrive as chunks too
Tool call arguments are streamed incrementally (e.g. `{"url": "htt`, `ps://...`, `"}`). They must be buffered and assembled before the tool can be executed — you cannot execute mid-stream.

### Presentation layer must be injected into ChatService
Currently `ChatService` has no reference to `Presentation`. Streaming requires it to print tokens as they arrive. This is a design change — either inject `Presentation` into `ChatService`, or pass a callback/writer into the `stream()` method.
```typescript
// option A: inject
constructor(private readonly provider: LLMProvider, private readonly presentation: Presentation) {}

// option B: pass per call (more flexible, no coupling)
public async stream(ctx: ChatContext, msg: string, onToken: (token: string) => void): Promise<void>
```
Option B is preferable — `ChatService` stays decoupled from the presentation layer.
