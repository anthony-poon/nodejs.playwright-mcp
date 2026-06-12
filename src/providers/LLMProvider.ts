export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type Message =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "assistant"; content: null; tool_calls: ToolCall[] }
  | { role: "user"; content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolFunction {
  name: string;
  description?: string;
  parameters: object;
}

export interface ChatRequest {
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
  stream?: boolean;
  stop?: string | string[];
  seed?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  n?: number;
}

export interface ChatResponse {
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
      tool_calls?: ToolCall[];
      reasoning: string|null;
    };
    finish_reason: "stop" | "tool_calls" | "length" | "content_filter" | null;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface Model {
  id: string;
  reasoning: boolean;
  max_context: number | undefined;
  vlm: boolean;
}

export interface LLMProvider {
  getNamespace: () => string
  chat(request: ChatRequest): Promise<ChatResponse>;
  listModels(): Promise<Model[]>;
}