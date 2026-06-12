import config from "./config";
import {ArliaClient} from "./clients/llm/ArliaClient";
import {LLMProvider} from "./providers/LLMProvider";
import {ArliaProvider} from "./providers/arlia/ArliaProvider";
import {ChatService} from "./services/chats/ChatService";
import {PlaywrightClient} from "./clients/llm/PlaywrightClient";
import {SnapshotService} from "./services/snapshots";
import {OpenAIProvider} from "./providers/openai/OpenAIProvider";
import {OpenAILLMClient} from "./clients/llm/OpenAILLMClient";
import httpClient from "./infra/http";
import {ToolCallTest} from "./use-cases/ToolCallTest";
import {HelloWorld} from "./use-cases/HelloWorld";
import {ToolRegistry} from "./services/tools/ToolRegistry";
import {withLogger} from "./infra/logger";
import {CliPresentation} from "./infra/presentation";
import {WebSearch, WebSearchContext} from "./use-cases/WebSearch";
import {PlaywrightToolProvider} from "./providers/tools/playwright/PlaywrightToolProvider";
import {DataLakeService} from "./services/data-lake/DataLakeService";
import path from "node:path";
import {Context} from "node:vm";

const logger = withLogger("app")

const buildContainer = async () => {
  let provider: LLMProvider;
  let model: string;
  switch (config.provider) {
    case "arlia":
      provider = new ArliaProvider(new ArliaClient(httpClient, config.arlia.key));
      model = config.arlia.model;
      break;
    case "openai":
      provider = new OpenAIProvider(new OpenAILLMClient(httpClient, config.openai.key));
      model = config.openai.model;
      break;
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }

  const playwright = new PlaywrightClient(httpClient, config.playwright.baseUrl);
  const snapshots = new SnapshotService(provider, playwright, config);

  const presentation = new CliPresentation();

  const tools = new ToolRegistry(presentation, [
    new PlaywrightToolProvider(playwright),
  ]);
  const chats = new ChatService(provider);
  const dataLake = new DataLakeService({
    path: path.join(config.path.var, "data-lake")
  })


  const commands: Record<string, (context?: any) => Promise<void>> = {
    "hello-world": () => new HelloWorld(chats, presentation, { model }).hello(),
    "hello-world-not": () => new HelloWorld(chats, presentation, { model }).notHello(),
    "tool-call-test": () => new ToolCallTest(chats, tools, presentation, { model }).test(),
    "web-search": (context) => new WebSearch(chats, tools, presentation, dataLake, { model }).exec(context as WebSearchContext)
  };

  return {playwright, snapshots, commands, presentation};
}

const withApp = async (run: (container: Awaited<ReturnType<typeof buildContainer>>) => Promise<void>) => {
  const app = await buildContainer();
  try {
    await run(app);
  } catch (e) {
    const error = e as Error;
    logger.error(error.message);
    logger.debug(error.stack)
  } finally {
    app.playwright.disconnect();
    app.presentation.close();
  }
}

export default withApp;
