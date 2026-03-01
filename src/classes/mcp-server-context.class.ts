import {
  CrashIfNotArguments,
  IContextModel,
  IContextModelOptions,
  IPrompt,
  IPromptMessage,
  IResource,
  IResourceContent,
  IServerClientInformation,
  ITool,
  IToolContextModelOptions,
  IToolsCallResponse,
  PromptsGetResponse,
  ResourcesListResponse,
  ToolCallResponse,
} from "@mcpbay/easy-mcp-server/types";
import { ContextVersion } from "../types/context-version.type.ts";
import { objectPick } from "../utils/object-pick.util.ts";
import { Resource } from "../types/resource.type.ts";
import { Tool } from "../types/tool.type.ts";
import { Prompt } from "../types/prompt.type.ts";
import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import {
  INTERNAL_ERROR,
  INVALID_PARAMS,
} from "@mcpbay/easy-mcp-server/constants";
import * as os from "node:os";
import { getStringUid } from "@online/get-string-uid";
import { UniversalAppChecker } from "./universal-app-checker.class.ts";
import { camelCaseToSnakeCase } from "../utils/camel-case-to-snake-case.util.ts";
import { writeLog } from "../utils/write-log.util.ts";
import type { ToolStrategyLocalConfig } from "../types/tool-strategy-local-config.type.ts";
import { handleLocalStrategy } from "./handlers/handle-local-strategy.handler.ts";
import { handleLocalScriptStrategy } from "./handlers/handle-local-script-strategy.handler.ts";
import { LogLevel, Role } from "@mcpbay/easy-mcp-server/enums";
import { JsonSchemaMapper } from "./json-schema-mapper.class.ts";
import { isObject } from "@online/is";

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
  protected contexts: ContextVersion[] = [];
  private cooldowns: Map<string, number> = new Map();
  private cache: Map<number, object> = new Map();
  protected readonly appChecker: UniversalAppChecker = new UniversalAppChecker();
  protected placeholders = new Map<string, string>();
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
    this.placeholders.set(
      ToolLocalWorkingDirectoryType.PROJECT_ROOT,
      Deno.env.get("PROJECT_ROOT") ?? process.cwd(),
    );
    this.placeholders.set(
      ToolLocalWorkingDirectoryType.WORKSPACE,
      Deno.env.get("WORKSPACE") ?? process.cwd(),
    );
    this.placeholders.set(
      ToolLocalWorkingDirectoryType.REPO_ROOT,
      Deno.env.get("REPO_ROOT") ?? process.cwd(),
    );
  }

  async onInitialize() {
    this.serverInformation = {
      name: "MCPBay Server!",
      version: "1.0.0",
    };

    writeLog("Initialized");

    const catchLogs = (_args: CrashIfNotArguments) => {
      writeLog(`EVENT [onInitialize] Exception`, LogLevel.ERROR);
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
            message:
              `Missing required environment variable "${variable.name}": ${variable.description}.`,
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
    writeLog(this.serverInformation);

    return this.serverInformation;
  }

  async onClientListPrompts(options: IContextModelOptions) {
    writeLog(`EVENT: onClientListPrompts`);

    const prompts = this.prompts.map((prompt) => {
      return objectPick(prompt, [
        "name",
        "description",
        "arguments",
      ]) as IPrompt;
    });

    writeLog(`EVENT [onClientListPrompts] Response`);
    writeLog(prompts);

    return prompts;
  }

  async onClientGetPrompt(
    prompt: IPrompt,
    args: Record<string, unknown>,
    options: IContextModelOptions,
  ): Promise<PromptsGetResponse> {
    writeLog(`EVENT: onClientGetPrompt`);

    const _prompt = this.prompts.find((p) => p.name === prompt.name)!;

    writeLog(`EVENT [onClientGetPrompt] Prompt`);
    writeLog(_prompt);

    const messages = _prompt.messages.map((message) => {
      if (message.content.type !== "text") {
        return message;
      }

      message.content = {
        ...message.content,
        text: this.applyArgsPlaceholders(
          this.applyPathPlaceholders(message.content.text!),
          args,
        ),
      };

      return message;
    });

    writeLog(`EVENT [onClientGetPrompt] Response`);
    writeLog(messages);

    return {
      description: _prompt.description,
      messages: messages as unknown as IPromptMessage[],
    } satisfies PromptsGetResponse;
  }

  async onClientListResources(
    options: IContextModelOptions,
  ): Promise<ResourcesListResponse> {
    writeLog(`EVENT: onClientListResources`);

    const resources = this.resources.map((resource) => {
      return objectPick(resource, [
        "id",
        "uri",
        "name",
        "mimeType",
        "size",
        "description",
        "title",
      ]) as LocalResource;
    });

    writeLog(`EVENT [onClientListResources] Response`);
    writeLog(resources);

    return resources;
  }

  async onClientReadResource(
    resourceUri: string,
    options: IContextModelOptions,
  ): Promise<IResourceContent[]> {
    writeLog(`EVENT: onClientReadResource`);

    const resource = this.resources.find((resource) =>
      resource.uri === resourceUri
    );
    const response = [{
      mimeType: resource?.mimeType,
      blob: resource?.blob ?? undefined,
      text: resource?.text ?? undefined,
      uri: resource?.uri,
    }] as IResourceContent[];

    writeLog(`EVENT [onClientReadResource] Response`);
    writeLog(response);

    return response;
  }

  async onClientListTools(options: IContextModelOptions): Promise<ITool[]> {
    writeLog(`EVENT: onClientListTools`);

    const tools = this.tools.map((tool) => {
      return objectPick(tool, ["name", "description", "inputSchema"]) as ITool;
    });

    writeLog(`EVENT [onClientListTools] Response`);
    writeLog(tools);

    return tools;
  }

  async onClientCallTool(
    tool: ITool,
    args: Record<string, unknown>,
    options: IToolContextModelOptions,
  ): Promise<ToolCallResponse> {
    writeLog(`EVENT: onClientCallTool`);
    writeLog(args);

    const catchLogs = (_args: CrashIfNotArguments) => {
      writeLog(`EVENT [onClientCallTool] Exception`, LogLevel.ERROR);
      writeLog(_args);
    };

    const _tool = this.tools.find((t) => t.name === tool.name);

    crashIfNot(_tool, {
      code: INVALID_PARAMS,
      message: "Tool not found",
      catch: catchLogs,
    });

    const { execution } = _tool;
    const platform = os.platform();

    writeLog(`EVENT [onClientCallTool] Platform: ${platform}`);

    crashIfNot(["darwin", "win32", "linux"].includes(platform), {
      code: INTERNAL_ERROR,
      message: `Invalid platform: ${platform}.`,
      catch: catchLogs,
    });

    const checkCache = (strategy: Tool["execution"]["0"]) => {
      const config = strategy.config as ToolStrategyLocalConfig;
      const { id: strategyId } = strategy;
      const { id: toolId } = _tool;

      if (config.deterministic) {
        const cachedResponse = this.getCachedResponse(toolId, strategyId, args);

        if (cachedResponse) {
          const response =
            cachedResponse as IToolsCallResponse["result"]["content"];

          writeLog(
            `EVENT [onClientCallTool] Response (deterministic|cached)`,
          );
          writeLog(config);

          return response;
        }
      }
    };

    for (const strategy of execution) {
      writeLog(`EVENT [onClientCallTool] Strategy: ${strategy.type}`);
      const context = {
        strategy,
        _tool,
        args,
        catchLogs,
        platform,
        tool,
      };

      if (strategy.type === "local") {
        const cache = checkCache(strategy);

        if (cache) {
          return cache;
        }

        this.startCooldown(tool.name, _tool.cooldownMs);

        const localStrategyResponse = await handleLocalStrategy.call(this, context);

        if (localStrategyResponse === true || !localStrategyResponse) {
          continue;
        }

        return localStrategyResponse;
      } else if (strategy.type === "local-script") {
        const cache = checkCache(strategy);

        if (cache) {
          return cache;
        }

        this.startCooldown(tool.name, _tool.cooldownMs);

        const localScriptStrategyResponse = await handleLocalScriptStrategy.call(this, context);

        if (localScriptStrategyResponse === true || !localScriptStrategyResponse) {
          continue;
        }

        return {
          content: [{
            role: Role.ASSISTANT,
            content: {
              type: "text",
              text: JSON.stringify(localScriptStrategyResponse)
            }
          }],
          structuredContent: localScriptStrategyResponse as Record<string, unknown>
        };
      }
    }

    crashIfNot(false, {
      code: INTERNAL_ERROR,
      message: `Any strategy satisfied.`,
      catch: catchLogs,
    });
  }

  applyPathPlaceholders(text: string) {
    return text.replace(
      /\{\{([\w_]+)\}\}/g,
      (_, placeholder) =>
        this.placeholders.get(camelCaseToSnakeCase(placeholder)) ?? "",
    );
  }

  applyArgsPlaceholders(text: string, args: Record<string, unknown>) {
    return text.replace(
      /\{\{(arg\.[\w_]+)\}\}/g,
      (_, placeholder) => String(args[placeholder] ?? ""),
    );
  }

  applyVariables(text: string, contextId: number) {
    return text.replace(
      /\{\{(env\.[\w_]+)\}\}/g,
      (_, variable) => this.variables[contextId][variable] ?? "",
    );
  }

  executeShellCommand(
    command: string,
    options?: Partial<IExecuteShellCommandOptions>,
  ) {
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

  cacheResponse(
    toolId: string,
    strategyId: string,
    args: Record<string, unknown>,
    response: IToolsCallResponse["result"]["content"],
  ) {
    const cacheId = getStringUid(toolId + strategyId + JSON.stringify(args));

    this.cache.set(cacheId, response);
  }

  getCachedResponse(toolId: string, strategyId: string, args: Record<string, unknown>) {
    const cacheId = getStringUid(toolId + strategyId + JSON.stringify(args));
    const cachedResponse = this.cache.get(cacheId);

    return cachedResponse;
  }

  async onInternalDebugInformation(message: string | object, level: LogLevel): Promise<void> {
    if (isObject(message)) {
      return writeLog(message, level);
    }

    writeLog(`[INTERNAL] (${level.toUpperCase()}) ${message}`, level);
  }
}

// const context = new Context();
// const server = new EasyMCPServer(new StdioTransport(), context, {
//   server: {
//     sendPromptsListChangedNotification: true,
//   }
// });

// server.start();
