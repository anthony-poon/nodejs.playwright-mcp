import {Tool, ToolProvider} from "../../providers/ToolProvider";
import {Presentation} from "../../infra/presentation";
import {DataLakeService} from "../../services/data-lake/DataLakeService";
import {WebSearchContext} from "./WebSeachContext";

export class WebSearchToolProvider implements ToolProvider {
    constructor(
        private readonly presentation: Presentation,
        private readonly dataLake: DataLakeService,
        private readonly context: WebSearchContext,
    ) {}

    getNamespace(): string {
        return "finish";
    }

    list(): Tool[] {
        const properties: Record<string, { type: string; description: string }> = {};
        const required: string[] = [];

        for (const goal of this.context.goals) {
            properties[goal.name] = { type: goal.type, description: goal.description };
            if (goal.isRequired) required.push(goal.name);
        }

        return [
            new Tool(
                "finish",
                "Call this once you have completed everything",
                { type: "object", properties, required },
                false,
            )
        ];
    }

    async execute(name: string, args: Record<string, string>): Promise<void> {
        switch (name) {
            case "finish":
                this.presentation.println(JSON.stringify(args, null, 2));
                this.dataLake.save("web-search", {
                    subjects: this.context.subject,
                    timestamp: new Date().toISOString(),
                    result: args,
                });
                return;
        }
        throw new Error("Invalid tool call name");
    }
}