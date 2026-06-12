import { type AxiosInstance } from "axios";

// Shared types
export type Message =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: null; tool_calls: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "user"; content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } }> }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolFunction {
  name: string;
  description?: string;
  parameters: object;
  strict?: boolean;
}

// Chat completions
export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  tools?: {
    type: "function";
    function: ToolFunction;
  }[];
  tool_choice?: "none" | "auto" | "required" | { type: "function"; function: { name: string } };
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  seed?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  n?: number;
  response_format?: { type: "text" | "json_object" | "json_schema"; json_schema?: object };
  logprobs?: boolean;
  top_logprobs?: number;
  user?: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      refusal: string | null;
      tool_calls?: {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }[];
    };
    finish_reason: "stop" | "tool_calls" | "length" | "content_filter" | null;
    logprobs: unknown | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: { cached_tokens: number };
    completion_tokens_details?: { reasoning_tokens: number };
  };
  system_fingerprint: string | null;
}

// Embeddings
export interface EmbeddingRequest {
  model: string;
  input: string | string[] | number[];
  encoding_format?: "float" | "base64";
  dimensions?: number;
  user?: string;
}

export interface EmbeddingResponse {
  object: "list";
  data: Array<{
    object: "embedding";
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

// Images
export interface ImageGenerateRequest {
  model?: string;
  prompt: string;
  n?: number;
  size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  response_format?: "url" | "b64_json";
  style?: "vivid" | "natural";
  user?: string;
}

export interface ImageEditRequest {
  model?: string;
  image: Blob;
  prompt: string;
  mask?: Blob;
  n?: number;
  size?: "256x256" | "512x512" | "1024x1024";
  response_format?: "url" | "b64_json";
  user?: string;
}

export interface ImageResponse {
  created: number;
  data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
}

// Models
export interface Model {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

export interface ModelList {
  object: "list";
  data: Model[];
}

// Moderations
export interface ModerationRequest {
  input: string | string[];
  model?: string;
}

export interface ModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }>;
}

export class OpenAILLMClient {
  private readonly baseUrl = "https://api.openai.com";

  constructor(
    private readonly client: AxiosInstance,
    private readonly apiKey: string,
  ) {}

  private get authHeaders() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  // Chat
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/chat/completions`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  // Embeddings
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/embeddings`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  // Images
  async generateImage(request: ImageGenerateRequest): Promise<ImageResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/images/generations`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async editImage(request: ImageEditRequest): Promise<ImageResponse> {
    const form = new FormData();
    form.append("image", request.image);
    form.append("prompt", request.prompt);
    if (request.mask) form.append("mask", request.mask);
    if (request.model) form.append("model", request.model);
    if (request.n !== undefined) form.append("n", String(request.n));
    if (request.size) form.append("size", request.size);
    if (request.response_format) form.append("response_format", request.response_format);
    if (request.user) form.append("user", request.user);

    const res = await this.client.post(`${this.baseUrl}/v1/images/edits`, form, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  // Models
  async listModels(): Promise<ModelList> {
    const res = await this.client.get(`${this.baseUrl}/v1/models`, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async getModel(modelId: string): Promise<Model> {
    const res = await this.client.get(`${this.baseUrl}/v1/models/${modelId}`, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async deleteModel(modelId: string): Promise<{ id: string; object: string; deleted: boolean }> {
    const res = await this.client.delete(`${this.baseUrl}/v1/models/${modelId}`, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  // Moderations
  async createModeration(request: ModerationRequest): Promise<ModerationResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/moderations`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }
}
