import { writeLog } from "../../utils/write-log.util.ts";
import {
  McpServerContext
} from "../mcp-server-context.class.ts";
import { StrategyHandlerContext } from "../types/strategy-handler-context.type.ts";
import { ToolLocalScriptStrategyConfig } from "../../types/tool-local-script-strategy-config.type.ts";
import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import {
  INTERNAL_ERROR,
  INVALID_PARAMS
} from "@mcpbay/easy-mcp-server/constants";
import { objectPick } from "../../utils/object-pick.util.ts";
import { isValidFileURI } from "../../validators/is-valid-file-uri.validator.ts";
import { tsExecute } from "../../utils/ts-execute.util.ts";
import { isObject } from "@online/is";
import { LogLevel } from "@mcpbay/easy-mcp-server/enums";

export async function handleLocalScriptStrategy(
  this: McpServerContext,
  context: StrategyHandlerContext,
) {
  const { args, strategy, platform, catchLogs, tool, _tool } = context;

  if (strategy.type !== "local-script") {
    return true;
  }

  const config = strategy.config as ToolLocalScriptStrategyConfig;

  writeLog(`EVENT [onClientCallTool] Config (ToolLocalScriptStrategyConfig)`);
  writeLog(config);

  if (config.language === "ts") {
    writeLog(`config.language === "ts"`);
    const properties = (tool.inputSchema as Record<string, object>)
      .properties as Record<string, string>;
    const propertiesWithoutWorkspacePath = Object.keys(properties).filter(
      (key) => key !== "workspacePath",
    );
    const fixedArgs = objectPick(args, propertiesWithoutWorkspacePath);
    const workspacePath = args.workspacePath as string;

    writeLog("workspacePath");
    writeLog(workspacePath);

    crashIfNot(workspacePath !== undefined, {
      code: INVALID_PARAMS,
      message: "Missing 'workspacePath' argument.",
    });

    crashIfNot(!!workspacePath, {
      code: INVALID_PARAMS,
      message: "'workspacePath' argument can't be empty.",
    })

    crashIfNot(isValidFileURI(workspacePath), {
      code: INVALID_PARAMS,
      message: "Invalid 'workspacePath' argument.",
    });

    writeLog(`Fixed Args`);
    writeLog(fixedArgs);

    try {
      const { outMessage, codeFilePath } = await tsExecute(config.code, {
        timeout: config.timeout ?? 10_000,
        cwd: new URL(workspacePath),
        permissions: {
          allowRead: config.allowReadProject,
          allowWrite: config.allowWriteProject,
          allowNet: config.allowedDomains,
          allowedPackages: config.allowedPackages
        },
        invoke: {
          function: "toolHandler",
          arguments: [fixedArgs]
        }
      });

      writeLog("Deno.removeSync(codeFilePath);");

      Deno.removeSync(codeFilePath);

      writeLog("return JSON.parse(outMessage);");
      writeLog(outMessage, LogLevel.CRITICAL);

      const lastLine = outMessage.split("\n").at(-1);

      writeLog({ lastLine }, LogLevel.WARNING);

      return JSON.parse(lastLine!);
    } catch (e) {
      crashIfNot(false, {
        code: INTERNAL_ERROR,
        message: `Error executing "${tool.name}" script: ${(e as Error).message}`
      });
    }
  }

  return true;
}
