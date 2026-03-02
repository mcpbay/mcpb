import { writeLog } from "../../utils/write-log.util.ts";
import {
  McpServerContext,
  ToolLocalWorkingDirectoryType,
} from "../mcp-server-context.class.ts";
import { StrategyHandlerContext } from "../types/strategy-handler-context.type.ts";
import { ToolLocalScriptStrategyConfig } from "../../types/tool-local-script-strategy-config.type.ts";
import { executeTs } from "../../sandboxes/typescript.sandbox.ts";
import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import { isPlainObject } from "@online/is";
import {
  INTERNAL_ERROR,
  INVALID_PARAMS,
} from "@mcpbay/easy-mcp-server/constants";
import { objectPick } from "../../utils/object-pick.util.ts";
import { isValidFileURI } from "../../validators/is-valid-file-uri.validator.ts";

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

    crashIfNot(isValidFileURI(workspacePath), {
      code: INVALID_PARAMS,
      message: "Invalid 'workspacePath' argument.",
    });

    writeLog(`Fixed Args`);
    writeLog(fixedArgs);

    const urlWorkspacePath = new URL(workspacePath);
    const executionPromise = executeTs(
      config.code,
      {
        fn: {
          functionName: "toolHandler",
          args: [fixedArgs],
        },
        timeout: config.timeout ?? 5000,
        permissions: {
          read: config.allowReadProject ? [urlWorkspacePath] : false,
          write: config.allowWriteProject ? [urlWorkspacePath] : false,
          env: config.allowedEnvironments.length
            ? config.allowedEnvironments
            : false,
          import: ["jsr.io:443", "npmjs.com:443", "deno.land:443"],
          run: false,
          net: ["jsr.io:443", "npmjs.com:443"].concat(config.allowedDomains),
        },
        allowedPackages: config.allowedPackages,
        cwd: workspacePath,
      },
    ).catch((e) => {
      writeLog("Error");
      writeLog(e.message);
      writeLog(e.stack);
    })
      .then((r) => {
        writeLog("Success");
        writeLog(r as object);
        return r;
      })
      .finally(() => {
        writeLog("Finally");
      });

    writeLog(`Before await it`);
    const executionResponse = await executionPromise;

    writeLog(`After await it`);
    writeLog(executionResponse as object);

    crashIfNot(isPlainObject(executionResponse), {
      code: INTERNAL_ERROR,
      message: "Wrong result type for script execution. Object expected.",
    });

    writeLog(`Execution response`);
    writeLog(executionResponse);

    return executionResponse;
  }

  return true;
}
