import type { ToolCall } from "../../../providers/LLMProvider";
import type { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";

type Message =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: null; tool_calls: ToolCall[] }
  | { role: "user"; content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> }
  | { role: "tool"; tool_call_id: string; content: string }

type ChatConfig = {
  model: string,
  prompt: string,
}

export class Chat {
  public readonly model: string;
  public readonly conversation: Message[] = []

  constructor(config: ChatConfig) {
    this.model = config.model;
    this.conversation.push({
      role: "system",
      content: config.prompt,
    })
  }

  addMessage(message: string): void {
    this.conversation.push({
      role: "user",
      content: message,
    })
  }

  addReply(message: string): void {
    this.conversation.push({
      role: "assistant",
      content: message,
    });
  }

  // Must be called before addToolResult — OpenAI requires the assistant's
  // tool_calls message to precede the tool result messages.
  addToolCalls(message: { tool_calls?: ToolCall[] }): void {
    this.conversation.push({
      role: "assistant",
      content: null,
      tool_calls: message.tool_calls!,
    });
  }

  addToolResult(toolCallId: string, result: CallToolResult): void {
    const text = result.content
      .filter((c): c is TextContent => c.type === "text")
      .map(c => c.text)
      .join("\n");
    this.conversation.push({
      role: "tool",
      tool_call_id: toolCallId,
      content: text,
    });
  }
}