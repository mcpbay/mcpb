import {
  IContextModel,
  IContextModelOptions,
  IPrompt,
  IServerClientInformation, IResource,
  IResourceContent,
  ITool,
  IToolContextModelOptions,
  IToolsCallResponse,
  IPromptMessage,
  ToolCallResponse,
  ResourcesListResponse,
  CrashIfNotArguments,
  PromptsGetResponse
} from "@mcpbay/easy-mcp-server/types";
import { Role } from "@mcpbay/easy-mcp-server/enums";
import { ContextVersion } from "../types/context-version.type.ts";
import { objectPick } from "../utils/object-pick.util.ts";
import { Resource } from "../types/resource.type.ts";
import { Tool } from "../types/tool.type.ts";
import { Prompt } from "../types/prompt.type.ts";
import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import { INTERNAL_ERROR, INVALID_PARAMS } from "@mcpbay/easy-mcp-server/constants";
import * as os from "node:os";
import { components } from "../api/schema.d.ts";
import { getStringUid } from "@online/get-string-uid";
import { UniversalAppChecker } from "./universal-app-checker.class.ts";
import { isJson } from "../validators/is-json.validator.ts";
import { fileExists } from "../utils/file-exists.util.ts";
import { camelCaseToSnakeCase } from "../utils/camel-case-to-snake-case.util.ts";
import { JsonSchemaMapper } from "./json-schema-mapper.class.ts";
import { IObjectJsonSchema } from "../validators/is-object-json-schema.validator.ts";
import { basename } from "jsr:@std/path";
import { fileNameToMime } from "../utils/file-name-to-mime.util.ts";
import { LogType, writeLog } from "../utils/write-log.util.ts";

type ToolStrategyLocalConfig = components["schemas"]["ToolStrategyLocalConfig"];

interface IExecuteShellCommandOptions {
  cwd: string;
  env: Record<string, string>;
  timeout: number;
  shell?: ToolStrategyLocalConfig["environment"]["shell"];
}

export enum ToolLocalWorkingDirectoryType {
  TEMP = "temp",
  WORKSPACE = "workspace",
  REPO_ROOT = "repo_root",
  CWD = "cwd",
  PROJECT_ROOT = "project_root",
}

type LocalResource = IResource & { id: string; };

export class McpServerContext implements IContextModel {
  private serverInformation!: IServerClientInformation;

  private prompts: Prompt[] = [];
  private resources: Resource[] = [];
  private tools: Tool[] = [];
  private contexts: ContextVersion[] = [];
  private cooldowns: Map<string, number> = new Map();
  private cache: Map<number, object> = new Map();
  private readonly appChecker: UniversalAppChecker = new UniversalAppChecker();
  private placeholders = new Map<string, string>();
  private variables: Record<string, Record<string, string>> = {};

  constructor(contexts: ContextVersion[]) {
    this.contexts = contexts;

    this.prompts = contexts
      .flatMap((contextVersion) => contextVersion.prompts);

    this.tools = contexts
      .flatMap((contextVersion) => contextVersion.tools);

    this.resources = contexts
      .flatMap((contextVersion) => contextVersion.resources);

    this.placeholders.set(ToolLocalWorkingDirectoryType.TEMP, os.tmpdir());
    this.placeholders.set(ToolLocalWorkingDirectoryType.CWD, process.cwd());
    this.placeholders.set(ToolLocalWorkingDirectoryType.PROJECT_ROOT, Deno.env.get("PROJECT_ROOT") ?? process.cwd());
    this.placeholders.set(ToolLocalWorkingDirectoryType.WORKSPACE, Deno.env.get("WORKSPACE") ?? process.cwd());
    this.placeholders.set(ToolLocalWorkingDirectoryType.REPO_ROOT, Deno.env.get("REPO_ROOT") ?? process.cwd());
  }

  async onInitialize() {
    this.serverInformation = {
      name: "MCPBay Server!",
      version: "1.0.0",
    };

    writeLog("Initialized");

    const catchLogs = (_args: CrashIfNotArguments) => {
      writeLog(`EVENT [onInitialize] Exception`, LogType.ERROR);
      writeLog(_args);
    };

    for (const context of this.contexts) {
      for (const variable of context.variables ?? []) {
        if (!variable.modifiable) {
          this.variables[context.id][variable.name] = variable.default ?? "";
          continue;
        }

        if (variable.required) {
          const value = Deno.env.get(variable.name);

          crashIfNot(value, {
            code: INVALID_PARAMS,
            message: `Missing required environment variable "${variable.name}": ${variable.description}.`,
            catch: catchLogs,
          });

          this.variables[context.id][variable.name] = value;
        } else {
          this.variables[context.id][variable.name] = variable.default ?? "";
        }
      }
    }
  }

  async onClientListInformation(
    _options: IContextModelOptions,
  ): Promise<IServerClientInformation> {
    writeLog(`EVENT: onClientListInformation`);
    return this.serverInformation;
  }


  async onClientListPrompts(options: IContextModelOptions) {
    writeLog(`EVENT: onClientListPrompts`);

    const prompts = this.prompts.map((prompt) => {
      return objectPick(prompt, ["name", "description", "arguments"]) as IPrompt;
    });

    writeLog(`EVENT [onClientListPrompts] Response`);
    writeLog(prompts);

    return prompts;
  }

  async onClientGetPrompt(prompt: IPrompt, args: Record<string, unknown>, options: IContextModelOptions): Promise<PromptsGetResponse> {
    writeLog(`EVENT: onClientGetPrompt`);

    const _prompt = this.prompts.find((p) => p.name === prompt.name)!;

    writeLog(`EVENT [onClientGetPrompt] Prompt`);
    writeLog(_prompt);

    const messages = _prompt.messages.map((message) => {
      if (message.content.type !== 'text') {
        return message;
      }

      message.content = { ...message.content, text: this.applyArgsPlaceholders(this.applyPathPlaceholders(message.content.text!), args) };

      return message;
    });

    writeLog(`EVENT [onClientGetPrompt] Response`);
    writeLog(messages);

    return { description: _prompt.description, messages: messages as unknown as IPromptMessage[] } satisfies PromptsGetResponse;
  }

  async onClientListResources(options: IContextModelOptions): Promise<ResourcesListResponse> {
    writeLog(`EVENT: onClientListResources`);

    const resources = this.resources.map((resource) => {
      return objectPick(resource, ["id", "uri", "name", "mimeType", "size", "description", "title"]) as LocalResource;
    });

    writeLog(`EVENT [onClientListResources] Response`);
    writeLog(resources);

    return resources;
  }

  async onClientReadResource(resourceUri: string, options: IContextModelOptions): Promise<IResourceContent[]> {
    writeLog(`EVENT: onClientReadResource`);

    const resource = this.resources.find((resource) => resource.uri === resourceUri);
    const response = [{ mimeType: resource?.mimeType, blob: resource?.blob ?? undefined, text: resource?.text ?? undefined, uri: resource?.uri }] as IResourceContent[];

    writeLog(`EVENT [onClientReadResource] Response`);
    writeLog(response);

    return response;
  }

  async onClientListTools(options: IContextModelOptions): Promise<ITool[]> {
    writeLog(`EVENT: onClientListTools`);

    const tools = this.tools.map((tool) => {
      return objectPick(tool, ["name", "description"]) as ITool;
    });

    writeLog(`EVENT [onClientListTools] Response`);
    writeLog(tools);

    return tools;
  }

  async onClientCallTool(tool: ITool, args: Record<string, unknown>, options: IToolContextModelOptions): Promise<ToolCallResponse> {
    writeLog(`EVENT: onClientCallTool`);

    const catchLogs = (_args: CrashIfNotArguments) => {
      writeLog(`EVENT [onClientCallTool] Exception`, LogType.ERROR);
      writeLog(_args);
    };

    const _tool = this.tools.find((t) => t.name === tool.name);

    crashIfNot(_tool, {
      code: INVALID_PARAMS,
      message: "Tool not found",
      catch: catchLogs
    });

    const { execution } = _tool;
    const platform = os.platform();

    writeLog(`EVENT [onClientCallTool] Platform: ${platform}`);

    crashIfNot(["darwin", "win32", "linux"].includes(platform), {
      code: INTERNAL_ERROR,
      message: `Invalid platform: ${platform}.`,
      catch: catchLogs
    });

    for (const strategy of execution) {

      writeLog(`EVENT [onClientCallTool] Strategy: ${strategy.type}`);

      if (strategy.type === "local") {
        const config = strategy.config as ToolStrategyLocalConfig;

        writeLog(`EVENT [onClientCallTool] Config`);
        writeLog(config);

        if (config.deterministic) {
          const cachedResponse = this.getCachedResponse(args);

          if (cachedResponse) {
            const response = cachedResponse as IToolsCallResponse["result"]["content"];

            writeLog(`EVENT [onClientCallTool] Response (deterministic|cached)`);
            writeLog(config);

            return response;
          }
        }

        const requriedOs = config.environment.os.map((os) => os === "windows" ? "win32" : os);

        writeLog(`EVENT [onClientCallTool] Required OS: ${requriedOs}`);

        if (requriedOs.length === 0) {
          continue;
        }

        if (!requriedOs.includes(platform as unknown as typeof requriedOs[number])) {
          continue;
        }

        const requiredAppsStatus = await this.appChecker.checkMultipleApps(config.environment.requires);

        writeLog(`EVENT [onClientCallTool] Required App Status`);
        writeLog(requiredAppsStatus);

        crashIfNot(requiredAppsStatus.every((status) => status.exists), {
          code: INTERNAL_ERROR,
          message: `Required apps not found: ${requiredAppsStatus
            .filter((status) => !status.exists)
            .map((status) => status.name)
            .join(", ")}`,
          catch: catchLogs
        });

        this.startCooldown(tool.name, config.cooldownMs);

        const commands = config.commands.filter(Boolean);

        writeLog(`EVENT [onClientCallTool] Commands`);
        writeLog(commands);

        if (commands.length === 0) {
          continue;
        }

        writeLog(`EVENT [onClientCallTool] Before Execution`);

        const execution = await (async () => {
          const workingDirectory = config.workingDirectory || this.placeholders.get(ToolLocalWorkingDirectoryType.CWD)!;
          const command =
            this.applyVariables(
              this.applyArgsPlaceholders(
                this.applyPathPlaceholders(config.commands[0]),
                args
              ),
              this.contexts.find((c) => c.tools.some((t) => t.id === _tool.id))!.id
            );
          const timeout = config.timeout ?? 1000 * 15;

          if (config.runInShell) {
            const shellExists = await this.appChecker.checkApp(config.environment.shell);

            crashIfNot(shellExists.exists, {
              code: INTERNAL_ERROR,
              message: `Shell not found: ${config.environment.shell}`,
              catch: catchLogs
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
          const { exitCode: criteriaSuccessCode, responseMatches, outputFormat } = successCriteria;
          const outputFilePath = successCriteria.outputFilePath?.replaceAll("\\", "/");

          if (outputFilePath) {
            writeLog(`EVENT [onClientCallTool] Ouput file path: ${outputFilePath}`);
          }

          crashIfNot(criteriaSuccessCode === code, {
            code: INTERNAL_ERROR,
            message: `Invalid exit code: ${code}, expected ${criteriaSuccessCode}.`,
            catch: catchLogs
          });

          if (responseMatches) {
            for (const match of responseMatches) {
              const matchRegex = new RegExp(match);

              crashIfNot(matchRegex.test(stdoutStr), {
                code: INTERNAL_ERROR,
                message: `Invalid response. expected to match ${match}.`,
                catch: catchLogs
              });
            }
          }

          const isJsonOutput = isJson(stdoutStr);
          const jsonOutput = (() => {
            try {
              return JSON.parse(stdoutStr) as object;
            } catch { }

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
                catch: catchLogs
              });

              const structuredContent: Record<string, unknown> = {};

              if (tool.outputSchema) {
                const jsonSchemaMapper = new JsonSchemaMapper(tool.outputSchema as IObjectJsonSchema, config.outputMapping!, jsonOutput as Record<string, unknown>);
                const output = jsonSchemaMapper.getOutput();

                Object.assign(structuredContent, output);
              }

              writeLog(`EVENT [onClientCallTool] Structured Content`);
              writeLog(structuredContent);

              const response = {
                content: [{
                  role: Role.ASSISTANT,
                  content: {
                    type: 'text',
                    text: stdoutStr
                  }
                }],
                structuredContent
              } satisfies ToolCallResponse;

              writeLog(`EVENT [onClientCallTool] Output JSON Response`);
              writeLog(response);

              return response;
            } else if (outputFormat === "file") {
              crashIfNot(outputFilePath, {
                code: INTERNAL_ERROR,
                message: `Output file path not provided in tool success criteria.`,
                catch: catchLogs
              });

              const patchedOutputFilePath = this.applyPathPlaceholders(outputFilePath);

              writeLog(`EVENT [onClientCallTool] Patched Output File Path: ${patchedOutputFilePath}`);

              crashIfNot(fileExists(patchedOutputFilePath), {
                code: INTERNAL_ERROR,
                message: `Invalid response. expected file does not exists: ${patchedOutputFilePath}.`,
                catch: catchLogs
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
            role: Role.ASSISTANT,
            content: {
              type: 'text',
              text: stdoutStr
            }
          }] satisfies ToolCallResponse;

          writeLog(`EVENT [onClientCallTool] Response`);
          writeLog(response);

          return response;
        }
      }
    }

    crashIfNot(false, {
      code: INTERNAL_ERROR,
      message: `Any strategy satisfied.`,
      catch: catchLogs
    });
  }

  applyPathPlaceholders(text: string) {
    return text.replace(/\{\{([\w_]+)\}\}/g, (_, placeholder) => this.placeholders.get(camelCaseToSnakeCase(placeholder)) ?? "");
  }

  applyArgsPlaceholders(text: string, args: Record<string, unknown>) {
    return text.replace(/\{\{(arg\.[\w_]+)\}\}/g, (_, placeholder) => String(args[placeholder] ?? ""));
  }

  applyVariables(text: string, contextId: number) {
    return text.replace(/\{\{(env\.[\w_]+)\}\}/g, (_, variable) => this.variables[contextId][variable] ?? "");
  }

  executeShellCommand(command: string, options?: Partial<IExecuteShellCommandOptions>) {
    const shell = options?.shell || command;
    const args = (() => {
      if (shell === "powershell") {
        return ["-Command", command];
      } else if (shell === "cmd") {
        return ["/c", command];
      } else if (shell === "zsh") {
        return ["-c", command];
      } else if (shell === "bash") {
        return ["-c", command];
      }

      return [];
    })();

    const execution = new Deno.Command(shell, {
      args,
      stdout: "piped",
      stderr: "piped",
      stdin: "null",
      cwd: options?.cwd,
      env: options?.env,
      signal: AbortSignal.timeout(options?.timeout ?? 1000 * 15),
    });

    return execution.output();
  }

  startCooldown(name: string, cooldownTime = 1000) {
    const cooldown = this.cooldowns.get(name);

    if (!cooldown) {
      return this.cooldowns.set(name, Date.now() + cooldownTime);
    }

    if (Date.now() >= cooldown) {
      return this.cooldowns.set(name, Date.now() + cooldownTime);
    }

    crashIfNot(true, {
      code: INTERNAL_ERROR,
      message: `Too many requests for "${name}".`,
    });
  }

  cacheResponse(args: Record<string, unknown>, response: IToolsCallResponse["result"]["content"]) {
    this.cache.set(getStringUid(JSON.stringify(args)), response);
  }

  getCachedResponse(args: Record<string, unknown>) {
    const cachedResponse = this.cache.get(getStringUid(JSON.stringify(args)));
    return cachedResponse;
  }
}

// const context = new Context();
// const server = new EasyMCPServer(new StdioTransport(), context, {
//   server: {
//     sendPromptsListChangedNotification: true,
//   }
// });

// server.start();