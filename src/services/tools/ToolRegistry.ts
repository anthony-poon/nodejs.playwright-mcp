import {ToolProvider} from "../../providers/ToolProvider";
import {Presentation} from "../../infra/presentation";
import {CallToolResult} from "@modelcontextprotocol/sdk/types";

export type ToolEntry = {
  name: string;
  description: string;
  schema: object;
  execute: (args: object) => Promise<CallToolResult | void>;
};

export type RegisteredTools = Map<string, ToolEntry>;

export class ToolRegistry {
  private readonly providers = new Map<string, ToolProvider>();

  constructor(
    private readonly presentation: Presentation,
    providers: ToolProvider[],
  ) {
    providers.forEach(provider => {
      this.providers.set(provider.getNamespace(), provider);
    });
  }

  public get(namespace: string): ToolProvider {
    const provider = this.providers.get(namespace);
    if (!provider) {
      throw new Error(`No provider with namespace: ${namespace}`);
    }
    return provider;
  }

  public create(providers: ToolProvider[]): RegisteredTools {
    const rtn: RegisteredTools = new Map();
    const granted = new Set<string>();

    providers.forEach(provider => {
      provider.list().forEach(tool => {
        if (rtn.has(tool.name)) {
          throw new Error(`Tool name: ${tool.name} already exists`);
        }
        rtn.set(tool.name, {
          name: tool.name,
          description: tool.description,
          schema: tool.inputSchema,
          execute: async (args: object) => {
            if (tool.isPermissionRequired && !granted.has(tool.name)) {
              const permission = await this.presentation.prompt(`Permission required to run tool "${tool.name}". (Y/N)`);
              if (permission.trim().toLowerCase() !== "y" && permission.trim().toLowerCase() !== "yes") {
                // TODO: Think about handling
                throw new Error("Permission not granted.");
              }
              granted.add(tool.name);
            }
            return provider.execute(tool.name, args);
          },
        });
      });
    });
    return rtn;
  }
}

