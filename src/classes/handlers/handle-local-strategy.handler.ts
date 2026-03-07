import {
  IToolsCallResponse,
  ToolCallResponse,
} from "@mcpbay/easy-mcp-server/types";
import { ToolStrategyLocalConfig } from "../../types/tool-strategy-local-config.type.ts";
import { writeLog } from "../../utils/write-log.util.ts";
import {
  McpServerContext,
  ToolLocalWorkingDirectoryType,
} from "../mcp-server-context.class.ts";
import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import { INTERNAL_ERROR } from "@mcpbay/easy-mcp-server/constants";
import { StrategyHandlerContext } from "../types/strategy-handler-context.type.ts";
import { isJson } from "../../validators/is-json.validator.ts";
import { JsonSchemaMapper } from "../json-schema-mapper.class.ts";
import { IObjectJsonSchema } from "../../validators/is-object-json-schema.validator.ts";
import { Role } from "@mcpbay/easy-mcp-server/enums";
import { fileExists } from "../../utils/file-exists.util.ts";
import { basename } from "@std/path/basename";
import { fileNameToMime } from "../../utils/file-name-to-mime.util.ts";

export async function handleLocalStrategy(
  this: McpServerContext,
  context: StrategyHandlerContext,
) {
  const { args, strategy, platform, catchLogs, tool, _tool } = context;

  if (strategy.type !== "local") {
    return true;
  }

  const config = strategy.config as ToolStrategyLocalConfig;

  writeLog(`EVENT [onClientCallTool] Config`);
  writeLog(config);

  const requriedOs = config.environment.os.map((os) =>
    os === "windows" ? "win32" : os
  );

  writeLog(`EVENT [onClientCallTool] Required OS: ${requriedOs}`);

  if (requriedOs.length === 0) {
    return true;
  }

  if (
    !requriedOs.includes(platform as unknown as typeof requriedOs[number])
  ) {
    return true;
  }

  const requiredAppsStatus = await this.appChecker.checkMultipleApps(
    config.environment.requires,
  );

  writeLog(`EVENT [onClientCallTool] Required App Status`);
  writeLog(requiredAppsStatus);

  crashIfNot(requiredAppsStatus.every((status) => status.exists), {
    code: INTERNAL_ERROR,
    message: `Required apps not found: ${
      requiredAppsStatus
        .filter((status) => !status.exists)
        .map((status) => status.name)
        .join(", ")
    }`,
    catch: catchLogs,
  });

  const commands = config.commands.filter(Boolean);

  writeLog(`EVENT [onClientCallTool] Commands`);
  writeLog(commands);

  if (commands.length === 0) {
    return true;
  }

  writeLog(`EVENT [onClientCallTool] Before Execution`);

  const execution = await (async () => {
    const workingDirectory = config.workingDirectory ||
      this.placeholders.get(ToolLocalWorkingDirectoryType.CWD)!;
    const command = this.applyVariables(
      this.applyArgsPlaceholders(
        this.applyPathPlaceholders(config.commands[0]),
        args,
      ),
      this.contexts.find((c) => c.tools.some((t) => t.id === _tool.id))!
        .id,
    );
    const timeout = config.timeout ?? 1000 * 15;

    if (config.runInShell) {
      const shellExists = await this.appChecker.checkApp(
        config.environment.shell,
      );

      crashIfNot(shellExists.exists, {
        code: INTERNAL_ERROR,
        message: `Shell not found: ${config.environment.shell}`,
        catch: catchLogs,
      });

      const shell = config.environment.shell;

      return await this.executeShellCommand(command, {
        cwd: workingDirectory,
        shell,
        timeout,
      });
    }

    return this.executeShellCommand(command, {
      cwd: workingDirectory,
      timeout,
    });
  })();

  const { stdout, stderr, code, signal, success } = execution;
  const stdoutStr = stdout.toString();
  const stderrStr = stderr.toString();

  writeLog(`EVENT [onClientCallTool] Execution Response`);
  writeLog({ stdout: stdoutStr, stderr: stderrStr, code, success });

  if (config.successCriteria) {
    writeLog(`EVENT [onClientCallTool] Success Criteria Present`);

    const { successCriteria } = config;
    const {
      exitCode: criteriaSuccessCode,
      responseMatches,
      outputFormat,
    } = successCriteria;
    const outputFilePath = successCriteria.outputFilePath?.replaceAll(
      "\\",
      "/",
    );

    if (outputFilePath) {
      writeLog(
        `EVENT [onClientCallTool] Ouput file path: ${outputFilePath}`,
      );
    }

    crashIfNot(criteriaSuccessCode === code, {
      code: INTERNAL_ERROR,
      message: `Invalid exit code: ${code}, expected ${criteriaSuccessCode}.`,
      catch: catchLogs,
    });

    if (responseMatches) {
      for (const match of responseMatches) {
        const matchRegex = new RegExp(match);

        crashIfNot(matchRegex.test(stdoutStr), {
          code: INTERNAL_ERROR,
          message: `Invalid response. expected to match ${match}.`,
          catch: catchLogs,
        });
      }
    }

    const isJsonOutput = isJson(stdoutStr);
    const jsonOutput = (() => {
      try {
        return JSON.parse(stdoutStr) as object;
      } catch {}

      return null;
    })();

    if (isJsonOutput) {
      writeLog(`EVENT [onClientCallTool] JSON Output`);
      writeLog(jsonOutput!);
    }

    if (outputFormat) {
      if (outputFormat === "json") {
        crashIfNot(isJsonOutput, {
          code: INTERNAL_ERROR,
          message: `Invalid response. expected to be JSON.`,
          catch: catchLogs,
        });

        const structuredContent: Record<string, unknown> = {};

        if (tool.outputSchema) {
          const jsonSchemaMapper = new JsonSchemaMapper(
            tool.outputSchema as IObjectJsonSchema,
            config.outputMapping!,
            jsonOutput as Record<string, unknown>,
          );
          const output = jsonSchemaMapper.getOutput();

          Object.assign(structuredContent, output);
        }

        writeLog(`EVENT [onClientCallTool] Structured Content`);
        writeLog(structuredContent);

        const response = {
          content: [{
            type: "text",
            text: stdoutStr,
          }],
          structuredContent,
        } satisfies ToolCallResponse;

        writeLog(`EVENT [onClientCallTool] Output JSON Response`);
        writeLog(response);

        return response;
      } else if (outputFormat === "file") {
        crashIfNot(outputFilePath, {
          code: INTERNAL_ERROR,
          message: `Output file path not provided in tool success criteria.`,
          catch: catchLogs,
        });

        const patchedOutputFilePath = this.applyPathPlaceholders(
          outputFilePath,
        );

        writeLog(
          `EVENT [onClientCallTool] Patched Output File Path: ${patchedOutputFilePath}`,
        );

        crashIfNot(fileExists(patchedOutputFilePath), {
          code: INTERNAL_ERROR,
          message:
            `Invalid response. expected file does not exists: ${patchedOutputFilePath}.`,
          catch: catchLogs,
        });

        const fileName = basename(patchedOutputFilePath);

        writeLog(`EVENT [onClientCallTool] Filename ${fileName}`);

        const response = [{
          type: "resource_link",
          uri: `file://${patchedOutputFilePath}`,
          name: fileName,
          mimeType: fileNameToMime(fileName),
          description: "The command output file.",
        }] satisfies ToolCallResponse;

        writeLog(`EVENT [onClientCallTool] Output File Response`);
        writeLog(response);

        return response;
      }
    }

    const response = [{
      type: "text",
      text: stdoutStr,
    }] satisfies ToolCallResponse;

    writeLog(`EVENT [onClientCallTool] Response`);
    writeLog(response);

    return response;
  }
}
