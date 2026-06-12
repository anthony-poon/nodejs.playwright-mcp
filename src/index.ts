import withApp from "./app";
import { parseArgs } from "./infra/args";
import {withLogger} from "./infra/logger";
import fs from "node:fs";
const args = parseArgs();

const logger = withLogger("index");

withApp(async (app) => {
  await app.snapshots.init();
  let context: any = undefined;
  if (args.context) {
    context = JSON.parse(fs.readFileSync(args.context, "utf-8"));
  }
  await app.commands[args.command](context);
});

