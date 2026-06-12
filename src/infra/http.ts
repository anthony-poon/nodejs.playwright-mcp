import axios from "axios";
import { withLogger } from "./logger";

const logger = withLogger("axios-client");

const httpClient = axios.create();

httpClient.interceptors.request.use((request) => {
  logger.trace(
    { method: request.method?.toUpperCase(), url: request.url, body: request.data },
    "HTTP request"
  );
  return request;
});

httpClient.interceptors.response.use(
  (response) => {
    const contentType = String(response.headers['content-type'] ?? '');
    const body = contentType.includes('text/event-stream') ? '[SSE stream]' : response.data;
    logger.trace(
      { method: response.config.method?.toUpperCase(), url: response.config.url, status: response.status, body },
      "HTTP response"
    );
    return response;
  },
  (error) => {
    logger.trace(
      { method: error.config?.method?.toUpperCase(), url: error.config?.url, status: error.response?.status, body: error.response?.data },
      "HTTP error response"
    );
    return Promise.reject(error);
  }
);

export default httpClient;