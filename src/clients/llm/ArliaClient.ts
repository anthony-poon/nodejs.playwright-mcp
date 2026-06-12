import { type AxiosInstance } from "axios";

// Text generation
export type Message =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: null; tool_calls: { id: string; type: "function"; function: { name: string; arguments: string } }[] }
  | { role: "user"; content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolFunction {
  name: string;
  description?: string;
  parameters: object;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  tools?: {
    type: "function";
    function: ToolFunction;
  }[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  repetition_penalty?: number;
  stream?: boolean;
  stop?: string | string[];
  seed?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  n?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      refusal: string | null;
      annotation: string | null;
      audio: string | null;
      function_call: unknown | null;
      tool_calls?: {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }[];
      reasoning: string|null;
    };
    finish_reason: "stop" | "tool_calls" | "length" | null;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface CompletionRequest {
  model: string;
  prompt: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  repetition_penalty?: number;
  stream?: boolean;
  stop?: string | string[];
  seed?: number;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{ index: number; text: string; finish_reason: string }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// Image generation
export interface Txt2ImgRequest {
  sd_model_checkpoint: string;
  prompt: string;
  negative_prompt?: string;
  steps?: number;
  sampler_name?: string;
  width?: number;
  height?: number;
  seed?: number;
  cfg_scale?: number;
  batch_size?: number;
  clip_skip?: number;
}

export interface Img2ImgRequest extends Txt2ImgRequest {
  init_images: string[];
  denoising_strength?: number;
  mask?: string;
}

export interface ImageResponse {
  images: string[];
  info?: string;
}

export interface UpscaleRequest {
  image: string;
  upscaler_1?: string;
  upscaling_resize?: number;
  resize_mode?: number;
}

export interface UpscaleResponse {
  image: string;
}

export interface TokenizeRequest {
  model?: string;
  prompt?: string;
  messages?: Message[];
}

export interface TokenizeResponse {
  count: number;
  max_model_len: number;
  tokens: number[];
  token_strs: string[] | null;
  model: string;
}

export interface TextModels {
  object: string;
  data: {
    id: string;
    root: string;
    object: string;
    owned_by: string;
    reasoning: boolean;
    max_context: number;
    engine: string;
    vlm: boolean;
  }[]
}

export interface ImageModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export class ArliaClient {
  private readonly baseUrl = "https://api.arliai.com";

  constructor(
    private readonly client: AxiosInstance,
    private readonly apiKey: string,
  ) {}

  private get authHeaders() {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  // Text generation
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/chat/completions`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async completion(request: CompletionRequest): Promise<CompletionResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/completions`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async tokenize(request: TokenizeRequest): Promise<TokenizeResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/tokenize`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  // Image generation
  async txt2img(request: Txt2ImgRequest): Promise<ImageResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/txt2img`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async img2img(request: Img2ImgRequest): Promise<ImageResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/img2img`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async upscaleImg(request: UpscaleRequest): Promise<UpscaleResponse> {
    const res = await this.client.post(`${this.baseUrl}/v1/upscale-img`, request, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  // Model info
  async getTextModels(): Promise<TextModels> {
    const res = await this.client.get(`${this.baseUrl}/v1/models`, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async getImageModels(): Promise<ImageModel[]> {
    const res = await this.client.get(`${this.baseUrl}/sdapi/v1/sd-models`, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async getUpscalers(): Promise<unknown> {
    const res = await this.client.get(`${this.baseUrl}/v1/upscalers`, {
      headers: this.authHeaders,
    });
    return res.data;
  }

  async getImgSamplers(): Promise<unknown> {
    const res = await this.client.get(`${this.baseUrl}/v1/img-samplers`, {
      headers: this.authHeaders,
    });
    return res.data;
  }
}
