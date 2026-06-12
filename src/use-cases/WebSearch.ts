import {Presentation} from "../infra/presentation";
import {ChatService} from "../services/chats/ChatService";
import {ToolRegistry} from "../services/tools/ToolRegistry";
import {Tool, ToolProvider} from "../providers/ToolProvider";
import {DataLakeService} from "../services/data-lake/DataLakeService";
import {WebSearchContext} from "./web-search/WebSeachContext";
import {WebSearchToolProvider} from "./web-search/WebSearchToolProvider";

type Config = {
  model: string;
}

function buildPrompt(context: WebSearchContext): string {
  const prompt = [`You are a web search agent. You will gathering information about that subject. \nUse the provided tools to gather information. Be thorough and use multiple sources where possible. Once you have collected everything, call the finish action with your findings.`];

  prompt.push(`## Instructions\n ${context.prompt}`);

  prompt.push(`## Goal\nFor each subject, collect the following information:\n`);
  prompt.push(context.goals.map(a => `- ${a.name}: ${a.description}${a.isRequired ? " (required)" : " (optional)"}`).join("\n"));

  return prompt.join("\n\n");
}

export class WebSearch {
  constructor(
    private readonly chats: ChatService,
    private readonly tools: ToolRegistry,
    private readonly presentation: Presentation,
    private readonly dataLake: DataLakeService,
    private readonly config: Config
  ) {}

  public async exec(context?: WebSearchContext): Promise<void> {
    if (!context) {
      throw new Error("Must provide context.")
    }
    const prompt = buildPrompt(context);
    const tools = this.tools.create([
      this.tools.get("playwright"),
      new WebSearchToolProvider(this.presentation, this.dataLake, context),
    ]);
    const ctx = this.chats.start(prompt, {
      model: this.config.model,
      tools: tools,
    });
    await this.chats.conversation(ctx, `## Subject: ${context.subject}`);
  }
}
