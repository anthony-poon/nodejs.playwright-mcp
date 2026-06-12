import type {AxiosInstance} from "axios";

class OpenAIEmbeddingClient {
  constructor(
    private readonly client: AxiosInstance,
    private readonly apiKey: string,
  ) {}
}