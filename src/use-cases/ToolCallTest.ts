import { ChatService } from "../services/chats/ChatService";
import { Presentation } from "../infra/presentation";
import { ToolRegistry } from "../services/tools/ToolRegistry";

type ToolCallConfig = {
  model: string;
}

export class ToolCallTest {
  private readonly prompt = `This is a test to test tool call. Please use the tool to visit the site user provided and describe what you see`;

  constructor(
    private readonly chats: ChatService,
    private readonly tools: ToolRegistry,
    private readonly presentation: Presentation,
    private readonly config: ToolCallConfig,
  ) {}

  public async test() {
    const context = this.tools.create([
      this.tools.get("playwright"),
    ]);
    const ctx = this.chats.start(this.prompt, {
      model: this.config.model,
      tools: context
    })
    await this.chats.conversation(ctx, "Go to www.example.com");

    ctx.chat.conversation.forEach(msg => {
      if (typeof msg.content === "string") {
        this.presentation.println(msg.content);
      } else if (Array.isArray(msg.content)) {
        msg.content.forEach(part => {
          if (part.type === "text") {
            this.presentation.println(part.text);
          } else {
            this.presentation.println(part.image_url.url);
          }
        });
      }
    });
  }
}
