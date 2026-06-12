import { ArgumentParser } from "argparse";

export type ParsedArgs = {
  command: string;
  context: string | null;
};

const parser = new ArgumentParser({
  description: "Playwright MCP runner",
});

parser.add_argument("command", {
  help: "Use case command to run",
});

parser.add_argument("-c", "--context", {
  help: "Path to context file",
  default: null,
});

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
  return parser.parse_args(argv) as ParsedArgs;
}
