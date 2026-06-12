import {Chat} from "./models/Chat";
import {RegisteredTools} from "../tools/ToolRegistry";

export class ChatContext {
  constructor(
    public readonly chat: Chat,
    public readonly tools?: RegisteredTools,
  ) {}
}