import {Tool, ToolProvider} from "../../ToolProvider";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { PlaywrightClient } from "../../../clients/llm/PlaywrightClient";
import snapshot from "./snapshots/tools_playwright.json";

const NAMESPACE = "playwright";

// Tools that require explicit user permission before execution.
// These are destructive or security-sensitive actions.
const PERMISSION_REQUIRED: string[] = [
  "browser_navigate",
  "browser_run_code_unsafe",
  "browser_file_upload",
  "browser_drop",
  "browser_handle_dialog",
  "browser_close",
];

// browser_run_code_unsafe is RCE-equivalent and should never be LLM-initiated.
const BLACKLIST: string[] = [
  "browser_run_code_unsafe",
];

export class PlaywrightToolProvider implements ToolProvider {
  constructor(private readonly client: PlaywrightClient) {}

  public getNamespace(): string {
    return NAMESPACE;
  }

  public list(): Tool[] {
    return snapshot.tools
      .filter(t => !BLACKLIST.includes(t.name))
      .map(t => new Tool(
        t.name,
        t.description,
        t.inputSchema as unknown as Tool["inputSchema"],
        PERMISSION_REQUIRED.includes(t.name),
      ));
  }

  public async execute(name: string, args: object): Promise<CallToolResult> {
    return this.client.callTool(name, args);
  }
}
