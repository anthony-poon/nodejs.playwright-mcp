import {ChatRequest, LLMProvider, ToolCall} from "../../providers/LLMProvider";
import {Chat} from "./models/Chat";
import {withLogger} from "../../infra/logger";
import {ChatContext} from "./ChatContext";
import {RegisteredTools} from "../tools/ToolRegistry";

type StartOptions = {
  model: string,
  tools?: RegisteredTools
}

export type ConversationResult =
  | { type: "stop"; content: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "length" }
  | { type: "content_filter" }

export class ChatService {
  private readonly logger = withLogger("chat-service");
  constructor(private readonly provider: LLMProvider) {}

  public start(prompt: string, options: StartOptions): ChatContext {
    const chat = new Chat({
      model: options.model,
      prompt
    });
    return new ChatContext(chat, options.tools);
  }

  public async push(ctx: ChatContext, message?: string): Promise<ConversationResult> {
    if (message) {
      ctx.chat.addMessage(message);
    }

    const request: ChatRequest = {
      model: ctx.chat.model,
      messages: ctx.chat.conversation,
    }

    if (ctx.tools) {
      request["tools"] = [...ctx.tools.values()].map((entry) => ({
        type: "function",
        function: {
          name: entry.name,
          description: entry.description,
          parameters: entry.schema
        }
      }));
    }

    this.logger.debug({ model: ctx.chat.model, messages: ctx.chat.conversation.length, tools: ctx.tools?.size ?? 0 }, "Sending chat request");
    const response = await this.provider.chat(request);
    const finish_reason = response.choices[0].finish_reason
    const { content, tool_calls } = response.choices[0]?.message ?? {};
    if (!content && !tool_calls) {
      this.logger.error({ response }, "Invalid reply");
      throw new Error("Invalid reply");
    }

    this.logger.debug({ finish_reason, tool_calls: tool_calls?.map(c => c.function.name) }, "Chat response");
    switch (finish_reason) {
      case "tool_calls":
        ctx.chat.addToolCalls(response.choices[0].message);
        return { type: "tool_calls", calls: tool_calls! };
      case "length":
        return { type: "length" };
      case "content_filter":
        return { type: "content_filter" };
      default:
        ctx.chat.addReply(content!);
        return { type: "stop", content: content! };
    }
  }

  public async conversation(ctx: ChatContext, msg: string): Promise<void> {
    let result = await this.push(ctx, msg);

    let finish = false;
    while (!finish && result.type === "tool_calls") {
      for (const call of result.calls) {
        const entry = ctx.tools?.get(call.function.name);
        if (!entry) {
          throw new Error(`Tool call received but no executor is registered for: ${call.function.name}`);
        }
        // TODO: Should not use undefined to imply finished tool call
        this.logger.debug({ tool: call.function.name, args: call.function.arguments }, "Executing tool call");
        let toolResult;
        try {
          toolResult = await entry.execute(JSON.parse(call.function.arguments));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(msg, "Tool call failed, returning error to model");
          ctx.chat.addToolResult(call.id, { isError: true, content: [{ type: "text", text: msg }] });
          result = await this.push(ctx);
          continue;
        }
        if (toolResult) {
          this.logger.debug({ tool: call.function.name }, "Tool call completed");
          ctx.chat.addToolResult(call.id, toolResult);
          result = await this.push(ctx);
        } else {
          finish = true;
        }
      }
    }
    // TODO: Add presentation? but have to be streamed instead of printing everything at the end
  }
}