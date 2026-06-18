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
import denoJson from "../../deno.json" with { type: "json" };

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
        items: TOOL_SCHEMA,
      },
      resources: {
        type: "array",
        items: RESOURCE_SCHEMA,
      },
      prompts: {
        type: "array",
        items: PROMPT_SCHEMA,
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
    required: ["resourceUri"],
  },
  // outputSchema: {
  //   type: "string",
  //   description: "The content of the resource."
  // }
};

const NATIVE_TOOL_MEMBERS = ["name", "title", "description", "inputSchema", "outputSchema", "execution", "annotations"] as (keyof ITool)[];
const NATIVE_PROMPT_MEMBERS = ["name", "title", "description", "arguments"] as (keyof IPrompt)[];
const NATIVE_RESOURCE_MEMBERS = ["name", "title", "description", "mimeType", "uri"] as (keyof IResource)[];

export interface ComputablePrompt extends IPrompt {
  id: string;
  execute(args: Record<string, unknown>, serverContext: McpServerContext): Promise<PromptsGetResponse>;
}

export interface ComputableTool extends ITool {
  id: string;
  execute(args: Record<string, unknown>, options: IToolContextModelOptions, serverContext: McpServerContext): Promise<ToolCallResponse>;
}

export interface ComputableResource extends IResource {
  id: string;
  execute(serverContext: McpServerContext): Promise<IResourceContent[]>;
}

export interface ILoadableServerContext {
  /**
   * The id of the context. Mostly for MCPBay contexts. For project contexts, it may be 0.
   */
  id: number;
  /**
   * The name of the context. Not a slug nor unique.
   */
  name: string;
  /**
   * The slug of the context.
   */
  slug: string;
  /**
   * The version of the context.
   */
  version: string;
  prompts: ComputablePrompt[];
  resources: ComputableResource[];
  tools: ComputableTool[];
  /**
   * An optional description of the context.
   */
  description?: string;
}

export class McpServerContext implements IContextModel {
  private serverInformation!: IServerClientInformation;

  private prompts: ComputablePrompt[] = [];
  private resources: ComputableResource[] = [];
  private tools: ComputableTool[] = [];

  protected contexts: ILoadableServerContext[] = [];

  private cooldowns = new Map<string, number>();
  private cache = new Map<number, object>();
  protected placeholders = new Map<string, string>();
  private variables: Record<string, Record<string, string>> = {};

  protected readonly appChecker = new UniversalAppChecker();

  constructor(contexts: ILoadableServerContext[]) {
    this.initializeInternals(contexts);

    this.placeholders.set(ToolLocalWorkingDirectoryType.TEMP, os.tmpdir());
    this.placeholders.set(ToolLocalWorkingDirectoryType.CWD, process.cwd());
    this.placeholders.set(ToolLocalWorkingDirectoryType.PROJECT_ROOT, Deno.env.get("PROJECT_ROOT") ?? process.cwd());
    this.placeholders.set(ToolLocalWorkingDirectoryType.WORKSPACE, Deno.env.get("WORKSPACE") ?? process.cwd());
    this.placeholders.set(ToolLocalWorkingDirectoryType.REPO_ROOT, Deno.env.get("REPO_ROOT") ?? process.cwd());

    writeLog("Placeholders");
    writeLog(Object.fromEntries(this.placeholders.entries()));
    writeLog(Deno.env.toObject());
  }

  initializeInternals(contexts: ILoadableServerContext[]) {
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
      version: denoJson.version,
    };

    writeLog("Initialized");

    const catchLogs = (_args: CrashIfNotArguments) => {
      writeLog(`EVENT [onInitialize] Exception`, LogLevel.ERROR);
      writeLog(_args);
    };

    // for (const context of this.contexts) {
    //   for (const variable of context.variables ?? []) {
    //     if (!variable.modifiable) {
    //       this.variables[context.id][variable.name] = variable.default ?? "";
    //       continue;
    //     }

    //     if (variable.required) {
    //       const value = Deno.env.get(variable.name);

    //       crashIfNot(value, {
    //         code: INVALID_PARAMS,
    //         message:
    //           `Missing required environment variable "${variable.name}": ${variable.description}.`,
    //         catch: catchLogs,
    //       });

    //       this.variables[context.id][variable.name] = value;
    //     } else {
    //       this.variables[context.id][variable.name] = variable.default ?? "";
    //     }
    //   }
    // }
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

    const promptResponse = await _prompt.execute(args, this);

    writeLog(`EVENT [onClientGetPrompt] Response`);
    writeLog(promptResponse);

    return promptResponse;
  }

  async onClientListResources(
    options: IContextModelOptions,
  ): Promise<ResourcesListResponse> {
    writeLog(`EVENT: onClientListResources`);

    const resources = this.resources.map((resource) => {
      return objectPick(resource, [...NATIVE_RESOURCE_MEMBERS, "id"]) as LocalResource;
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

    crashIfNot(resource, {
      code: INVALID_PARAMS,
      message: `Resource '${resourceUri}' does not exist`,
    });

    try {
      const response = await resource.execute(this);

      writeLog(`EVENT [onClientReadResource] Response`);
      writeLog(response);

      return response;
    } catch (e) {
      crashIfNot(false, {
        code: INTERNAL_ERROR,
        message: (e as Error).message,
      });
    }
  }

  async onClientListTools(options: IContextModelOptions): Promise<ITool[]> {
    writeLog(`EVENT: onClientListTools`);

    const tools = this.tools.map((tool) => {
      return objectPick(tool, NATIVE_TOOL_MEMBERS) as ITool;
    });

    /**
     * Alex:
     * We do inject the `workspacePath` argument into all tools...
     * MCP clients does not provide any way to get information about project/workspace paths.
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
     * Yeah... MCP clients doesn't provide minimum information like the workspace path.
     */
    if (tool.name === LoadContextsTool.name) {
      const workspacePath = args.workspacePath as string;
      const configFilePath = `${workspacePath}/mcp-config.json`;

      const contexts = await loadContextsFromConfigFile(
        configFilePath,
        false,
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
      const resources = await this.onClientListResources(
        void 0 as unknown as IContextModelOptions,
      );
      const tools = await this.onClientListTools(
        void 0 as unknown as IContextModelOptions,
      );
      const prompts = await this.onClientListPrompts(
        void 0 as unknown as IContextModelOptions,
      );
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
      const resources = await this.onClientListResources(
        void 0 as unknown as IContextModelOptions,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(resources),
          },
        ],
        structuredContent: {} as unknown as Record<string, unknown>,
      };
    } else if (tool.name === ReadResourceTool.name) {
      const uri = args.resourceUri as string;
      const resource = await this.onClientReadResource(
        uri,
        void 0 as unknown as IContextModelOptions,
      );

      // @ts-ignore: Alex: I don't want to typecheck here...
      const content: string = resource[0]?.blob ?? resource[0]?.text;

      return [{
        type: "text",
        text: content,
      }];
    }

    const _tool = this.tools.find((t) => t.name === tool.name);

    crashIfNot(_tool, {
      code: INVALID_PARAMS,
      message: "Tool not found",
      catch: catchLogs,
    });

    try {
      const toolResult = await _tool.execute(args, options, this);

      return toolResult;
    } catch (e) {
      crashIfNot(false, {
        code: INTERNAL_ERROR,
        message: (e as Error).message,
      });
    }
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