import { CrashIfNotArguments, ITool } from "@mcpbay/easy-mcp-server/types";
import { Tool } from "../../types/tool.type.ts";

export interface StrategyHandlerContext {
  strategy: Tool["execution"]["0"];
  args: Record<string, unknown>;
  platform: string;
  catchLogs: (_args: CrashIfNotArguments) => void;
  tool: ITool;
  _tool: Tool;
}
