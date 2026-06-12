import pino from "pino";
import fs from "node:fs";
import path from "node:path";
import {Transform} from "node:stream";
import config from "../config";

const logsDir = path.join(config.path.var, "logs");
fs.mkdirSync(logsDir, { recursive: true });

const traceLog = path.join(logsDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.trace.log`);
const debugLog = path.join(logsDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.debug.log`);

function formatStream(destination: NodeJS.WritableStream) {
  return new Transform({
    transform(chunk, _encoding, callback) {
      try {
        const {level, namespace, time, msg, ...context} = JSON.parse(chunk.toString());
        const timestamp = new Date(time).toISOString();
        const ctx = Object.keys(context).length ? " " + JSON.stringify(context) : "";
        destination.write(`[${level.toString().toUpperCase()}][${namespace ?? "-"}][${timestamp}]: ${msg} ${ctx}\n`);
      } catch (e) {
        destination.write(chunk);
      }
      callback();
    }
  });
}

const logger = pino(
  { level: "trace", formatters: { level: (label) => ({ level: label }) } },
  pino.multistream([
    {
      level: "trace",
      stream: formatStream(fs.createWriteStream(traceLog, { flags: "a" })),
    },{
      level: "debug",
      stream: formatStream(fs.createWriteStream(debugLog, { flags: "a" })),
    },
    {
      level: "info",
      stream: formatStream(process.stderr),
    },
  ])
);

export function withLogger(namespace: string) {
  return logger.child({ namespace });
}

export default logger;
