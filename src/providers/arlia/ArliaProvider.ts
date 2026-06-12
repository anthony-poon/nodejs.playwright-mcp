import { ArliaClient } from "../../clients/llm/ArliaClient";
import type { ChatRequest, ChatResponse, LLMProvider, Model } from "../LLMProvider";

export class ArliaProvider implements LLMProvider {
  constructor(private readonly client: ArliaClient) {}

  getNamespace(): string {
    return "arlia";
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.client.chatCompletion(request);
  }

  async listModels(): Promise<Model[]> {
    const response = await this.client.getTextModels();
    return response.data.map(model => ({
      id: model.id,
      reasoning: model.reasoning,
      max_context: model.max_context,
      vlm: model.vlm,
    }))
  }
}