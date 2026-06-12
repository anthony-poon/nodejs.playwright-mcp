import { OpenAILLMClient } from "../../clients/llm/OpenAILLMClient";
import type { ChatRequest, ChatResponse, LLMProvider, Model } from "../LLMProvider";

// https://developers.openai.com/api/docs/models
const MODEL_CAPABILITIES: Record<string, { reasoning: boolean; max_context: number; vlm: boolean }> = {
  "gpt-5.5":              { reasoning: true,  max_context: 1_000_000, vlm: true  },
  "gpt-5.4":              { reasoning: true,  max_context: 1_000_000, vlm: true  },
  "gpt-5.4-mini":         { reasoning: true,  max_context:   400_000, vlm: true  },
  "gpt-4.1":              { reasoning: false, max_context: 1_047_576, vlm: true  },
  "gpt-4.1-mini":         { reasoning: false, max_context: 1_047_576, vlm: true  },
  "gpt-4.1-nano":         { reasoning: false, max_context: 1_047_576, vlm: true  },
  "gpt-4o":               { reasoning: false, max_context:   128_000, vlm: true  },
  "gpt-4o-mini":          { reasoning: false, max_context:   128_000, vlm: true  },
  "gpt-4-turbo":          { reasoning: false, max_context:   128_000, vlm: true  },
  "gpt-4":                { reasoning: false, max_context:     8_192, vlm: false },
  "o4-mini":              { reasoning: true,  max_context:   200_000, vlm: true  },
  "o3":                   { reasoning: true,  max_context:   200_000, vlm: true  },
  "o3-mini":              { reasoning: true,  max_context:   200_000, vlm: false },
  "o1":                   { reasoning: true,  max_context:   200_000, vlm: true  },
  "o1-mini":              { reasoning: true,  max_context:   128_000, vlm: false },
  "o1-preview":           { reasoning: true,  max_context:   128_000, vlm: false },
};

export class OpenAIProvider implements LLMProvider {
  constructor(private readonly client: OpenAILLMClient) {}

  getNamespace(): string {
    return "openai";
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.chatCompletion(request);
    return {
      id: response.id,
      object: response.object,
      created: response.created,
      model: response.model,
      choices: response.choices.map(choice => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
          refusal: choice.message.refusal,
          annotation: null,
          audio: null,
          function_call: null,
          tool_calls: choice.message.tool_calls,
          reasoning: null,
        },
        finish_reason: choice.finish_reason,
      })),
      usage: response.usage,
    };
  }

  async listModels(): Promise<Model[]> {
    const response = await this.client.listModels();
    return response.data.map(model => {
      const caps = MODEL_CAPABILITIES[model.id];
      return {
        id: model.id,
        reasoning: caps?.reasoning ?? false,
        max_context: caps?.max_context ?? undefined,
        vlm: caps?.vlm ?? false,
      };
    });
  }
}
