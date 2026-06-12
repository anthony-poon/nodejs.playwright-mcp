import {LLMProvider} from "../../providers/LLMProvider";
import * as fs from "node:fs";
import {PlaywrightClient} from "../../clients/llm/PlaywrightClient";
import {withLogger} from "../../infra/logger";

type AssetServiceConfig = {
  path: {
    base: string;
    var: string
  }
}

type Assertion = {
  expectation: string,
  actual: string,
}

export class SnapshotService {
  private readonly logger = withLogger("snapshot-service");
  private readonly pathToFolder: string;
  private readonly assertions: Assertion[] = [];
  constructor(
    private readonly provider: LLMProvider,
    private readonly playwright: PlaywrightClient,
    private readonly config: AssetServiceConfig,
  ) {
    this.pathToFolder = config.path.var + `/snapshots`;
    this.assertions.push({
      expectation: config.path.base + `/src/services/tools/playwright/snapshots/tools_playwright.json`,
      actual: config.path.var + `/snapshots/tools_playwright.json`
    })
  }
  async init() {
    fs.mkdirSync(this.pathToFolder, { recursive: true });
    this.logger.info("Initializing snapshot for text models");
    await this.doTextModels();

    this.logger.info("Initializing snapshot for playwright client");
    await this.doPlaywright();
  }

  private async doTextModels() {
    const namespace = this.sanitize(this.provider.getNamespace());

    const stream = fs.createWriteStream(this.pathToFolder + `/text_models_${namespace}.json`, { flags: "w" });
    const models = await this.provider.listModels();
    stream.write(JSON.stringify({
      models,
    }, null, 2));
    stream.end();
  }

  private async doPlaywright() {
    const stream = fs.createWriteStream(this.pathToFolder + `/tools_playwright.json`, { flags: "w" });
    const response = await this.playwright.listTools();
    stream.write(JSON.stringify({
      tools: response.tools,
    }, null, 2));
    stream.end();
  }

  private sanitize(input: string) {
    return input.toLowerCase().replace(/[^a-z_.]/g, "_")
  }
}