import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface ToolProvider {
  getNamespace(): string;
  list(): Tool[];
  execute(name: string, args: object): Promise<CallToolResult | void>;
}

export class Tool {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly inputSchema: McpTool["inputSchema"],
    public readonly isPermissionRequired: boolean,
  ) {}
}
