import { writeLog } from "../../utils/write-log.util.ts";
import { McpServerContext, ToolLocalWorkingDirectoryType } from "../mcp-server-context.class.ts";
import { StrategyHandlerContext } from "../types/strategy-handler-context.type.ts";
import { ToolLocalScriptStrategyConfig } from "../../types/tool-local-script-strategy-config.type.ts";
import { executeTs } from "../../sandboxes/typescript.sandbox.ts";
import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import { isPlainObject } from "@online/is";
import { INTERNAL_ERROR } from "@mcpbay/easy-mcp-server/constants";

export async function handleLocalScriptStrategy(this: McpServerContext, context: StrategyHandlerContext) {
  const { args, strategy, platform, catchLogs, tool, _tool } = context;

  if (strategy.type !== "local-script") {
    return true;
  }

  const config = strategy.config as ToolLocalScriptStrategyConfig;

  writeLog(`EVENT [onClientCallTool] Config (ToolLocalScriptStrategyConfig)`);
  writeLog(config);

  if (config.language === "ts") {
    const executionPromise = executeTs(
      config.code,
      {
        fn: {
          functionName: "toolHandler",
          args: [args]
        },
        timeout: config.timeout ?? 5000,
        permissions: {
          read: config.allowReadProject ? [this.placeholders.get(ToolLocalWorkingDirectoryType.PROJECT_ROOT)!] : false,
          write: config.allowWriteProject ? [this.placeholders.get(ToolLocalWorkingDirectoryType.PROJECT_ROOT)!] : false,
          env: config.allowedEnvironments.length ? config.allowedEnvironments : false,
          import: config.allowedPackages,
          run: false,
          net: config.allowedDomains,
        }
      }
    );

    executionPromise.catch((e) => {
      writeLog("Error");
      writeLog(e.message);
    });

    const executionResponse = await executionPromise;

    crashIfNot(isPlainObject(executionResponse), {
      code: INTERNAL_ERROR,
      message: "Wrong result type for script execution. Object expected."
    });

    writeLog(`Execution response`);
    writeLog(executionResponse);

    return executionResponse;
  }

  return true;
}