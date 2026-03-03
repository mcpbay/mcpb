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
import { LogLevel } from "@mcpbay/easy-mcp-server/enums";
import { isObject } from "@online/is";
import { loadContextsFromConfigFile } from "../utils/load-contexts-from-config-file.util.ts";
import { LOAD_CONTEXTS_TOOL_NAME } from "../constants/load-contexts-tool-name.constant.ts";
import { RESOURCE_SCHEMA } from "./schemas/resource.schema.ts";
import { TOOL_SCHEMA } from "./schemas/tool.schema.ts";
import { PROMPT_SCHEMA } from "./schemas/prompts.schema.ts";

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

const workspacePath = {
  type: "string",
  description: "file:// URI pointing to a workspace directory.",
  pattern: `^file:\\/\\/\\/?[^<>:"|?*\\r\\n]+$`,
};

const LoadContextsTool: ITool = {
  name: LOAD_CONTEXTS_TOOL_NAME,
  description:
    "Load the resource, prompts and tools to use. Required to be called always you going to start a task.",
  inputSchema: {
    type: "object",
    properties: { workspacePath },
    required: ["workspacePath"],
  },
  outputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "The status of the execution.",
        oneOf: [
          {
            const: "completed",
            description: "The action was completed succesfully.",
            title: "Completed Action",
          },
          {
            const: "failed",
            description: "The action failed.",
            title: "Action Filed",
          },
        ],
      },
      tools: {
        type: "array",
        items: TOOL_SCHEMA
      },
      resources: {
        type: "array",
        items: RESOURCE_SCHEMA
      },
      prompts: {
        type: "array",
        items: PROMPT_SCHEMA
      },
    },
    required: ["status"],
  },
};

const LoadContextsToolSuccessResponse: ToolCallResponse = {
  content: [{
    type: "text",
    text: JSON.stringify({ status: "completed" }),
  }],
  structuredContent: { status: "completed" } as Record<
    string,
    unknown
  >,
};

const LoadContextsToolErrorResponse: ToolCallResponse = {
  content: [{
    type: "text",
    text: JSON.stringify({ status: "failed" }),
  }],
  structuredContent: { status: "failed" } as Record<
    string,
    unknown
  >,
};

const ListResourcesTool: ITool = {
  name: "mcpb_list_resources",
  description: "List the resources of the mcpbay MCP.",
  inputSchema: {
    type: "object",
    properties: {},
    // required: []
  },
  // outputSchema: {
  //   type: "array",
  //   items: RESOURCE_SCHEMA
  // }
};

const ReadResourceTool: ITool = {
  name: "mcpb_read_resource",
  description: "Reads a particular resource.",
  inputSchema: {
    type: "object",
    properties: {
      resourceUri: {
        type: "string",
        description: "The resource URI.",
        pattern: `^file:\\/\\/\\/?[^<>:"|?*\\r\\n]+$`,
      },
    },
    required: ["resourceUri"]
  },
  // outputSchema: {
  //   type: "string",
  //   description: "The content of the resource."
  // }
};

export class McpServerContext implements IContextModel {
  private serverInformation!: IServerClientInformation;

  private prompts: Prompt[] = [];
  private resources: Resource[] = [];
  private tools: Tool[] = [];
  protected contexts: ContextVersion[] = [];
  private cooldowns: Map<string, number> = new Map();
  private cache: Map<number, object> = new Map();
  protected readonly appChecker: UniversalAppChecker =
    new UniversalAppChecker();
  protected placeholders = new Map<string, string>();
  private variables: Record<string, Record<string, string>> = {};

  constructor(contexts: ContextVersion[]) {
    this.initializeInternals(contexts);

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

    writeLog("Placeholders");
    writeLog(Object.fromEntries(this.placeholders.entries()));

    writeLog(Deno.env.toObject());
  }

  initializeInternals(contexts: ContextVersion[]) {
    this.contexts = contexts;

    this.prompts = contexts
      .flatMap((contextVersion) => contextVersion.prompts);

    this.tools = contexts
      .flatMap((contextVersion) => contextVersion.tools);

    this.resources = contexts
      .flatMap((contextVersion) => contextVersion.resources);
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

    /**
     * Alex:
     * We do inject the `workspacePath` argument into all tools...
     * MCP Clients does not provide any way to get information about project/workspace paths.
     */

    for (const tool of tools) {
      if ("inputSchema" in tool && isObject(tool.inputSchema)) {
        const inputSchema = tool.inputSchema as {
          type: string;
          properties: unknown;
          required?: string[];
        };

        if (
          inputSchema.type === "object" && "properties" in inputSchema &&
          isObject(inputSchema.properties)
        ) {
          if ("workspacePath" in inputSchema.properties) {
            continue;
          }

          inputSchema.properties = {
            ...inputSchema.properties,
            workspacePath,
          };

          if (!inputSchema.required?.includes("workspacePath")) {
            inputSchema.required?.push("workspacePath");
          }
        }
      }
    }

    writeLog(`EVENT [onClientListTools] Response`);
    writeLog(tools);

    return tools.concat(LoadContextsTool, ReadResourceTool, ListResourcesTool);
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

    /**
     * Alex: I HATE THIS!! But all MCP clients are s***... I need to force them to call few tools on
     * each task to make the mcp load contexts on each project.
     * 
     * Yeah... MCP clients does not provide as minimum information as the workspace path to the MCP.
     */
    if (tool.name === LoadContextsTool.name) {
      const workspacePath = args.workspacePath as string;
      const configFilePath = `${workspacePath}/mcp-config.json`;

      const contexts = await loadContextsFromConfigFile(
        configFilePath,
        false
      );

      writeLog("Loaded new contests");
      writeLog(contexts);

      this.initializeInternals(contexts);
      /**
       * Alex: Many MCP clients care a f*** these notifications...
       */
      options.notify.toolsListChanged();
      options.notify.promptsListChanged();
      options.notify.resourcesListChanged();

      writeLog("INTERNAL_LISTS");
      const resources = await this.onClientListResources(void 0 as unknown as IContextModelOptions);
      const tools = await this.onClientListTools(void 0 as unknown as IContextModelOptions);
      const prompts = await this.onClientListPrompts(void 0 as unknown as IContextModelOptions);
      const result = { status: "completed", resources, tools, prompts };
      writeLog("END_INTERNAL_LISTS");

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result),
        }],
        structuredContent: result as Record<
          string,
          unknown
        >,
      };
    } else if (tool.name === ListResourcesTool.name) {
      /**
       * Alex: Yeah... I need to implement this because OpenCode doesn't know what resources are.
       * ñ_ñ
       */

      // Hacky... just for now...
      const resources = await this.onClientListResources(void 0 as unknown as IContextModelOptions);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(resources)
          }
        ],
        structuredContent: {} as unknown as Record<string, unknown>
      };
    } else if (tool.name === ReadResourceTool.name) {
      const uri = args.resourceUri as string;
      const resource = await this.onClientReadResource(uri, void 0 as unknown as IContextModelOptions);

      // @ts-ignore: Alex: I don't want to typecheck here...
      const content: string = resource[0]?.blob ?? resource[0]?.text;

      return [{
        type: "text",
        text: content
      }];
    }

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

        const localStrategyResponse = await handleLocalStrategy.call(
          this,
          context,
        );

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

        const localScriptStrategyResponse = await handleLocalScriptStrategy
          .call(this, context);

        if (
          localScriptStrategyResponse === true || !localScriptStrategyResponse
        ) {
          continue;
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify(localScriptStrategyResponse),
          }],
          structuredContent: localScriptStrategyResponse as Record<
            string,
            unknown
          >,
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

  getCachedResponse(
    toolId: string,
    strategyId: string,
    args: Record<string, unknown>,
  ) {
    const cacheId = getStringUid(toolId + strategyId + JSON.stringify(args));
    const cachedResponse = this.cache.get(cacheId);

    return cachedResponse;
  }

  async onInternalDebugInformation(
    message: string | object,
    level: LogLevel,
  ): Promise<void> {
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
