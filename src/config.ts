import * as fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: fs.realpathSync(__dirname + "/../.env") });

const config = {
  provider: process.env.LLM_PROVIDER?.toLowerCase(),
  arlia: {
    key: process.env.ARLIA_API_KEY ?? "",
    model: process.env.ARLIA_MODEL_NAME ?? "",
  },
  openai: {
    key: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL_NAME ?? "",
  },
  path: {
    base: fs.realpathSync(__dirname + "/.."),
    var: fs.realpathSync(__dirname + "/../var")
  },
  playwright: {
    baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8931"
  }
};

export type ApplicationEnv = typeof config;

export default config;
