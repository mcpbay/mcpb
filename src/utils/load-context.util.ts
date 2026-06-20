import { type IImport } from "../interfaces/mcp-package.interface.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { downloadAndInstallContextBySlug } from "./download-and-install-context-by-slug.util.ts";
import { exists } from "./exists.util.ts";
import { writeLog } from "./write-log.util.ts";
import { getDirname } from "./get-dirname.util.ts";
import { readJsonFromFile } from "./read-json-from-file.util.ts";
import { type IContextConfig, type ITSExecuteOptions, MCPContext } from "@mcpbay/contexts-manager";
import { isContextProjectFolder } from "@mcpbay/contexts-manager";
import { ComputablePrompt, ComputableResource, ComputableTool, ILoadableServerContext } from "../classes/mcp-server-context.class.ts";
import { CrashIfNotArguments, IPromptArgument, IPromptMessage, IResourceContent, IToolsCallResponse, PromptsGetResponse, ToolCallResponse } from "@mcpbay/easy-mcp-server/types";
import { LogLevel, Role } from "@mcpbay/easy-mcp-server/enums";
import { objectPick } from "./object-pick.util.ts";
import { applyArgs } from "./apply-args.util.ts";
import * as os from "node:os";
import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import { INTERNAL_ERROR } from "@mcpbay/easy-mcp-server/constants";
import { Tool } from "../types/tool.type.ts";
import { ToolStrategyLocalConfig } from "../types/tool-strategy-local-config.type.ts";
import { Memoizer } from "../classes/memoizer.class.ts";
import { handleLocalStrategy } from "../classes/handlers/handle-local-strategy.handler.ts";
import { Temporizer } from "../classes/temporizer.class.ts";
import { StrategyHandlerContext } from "../classes/types/strategy-handler-context.type.ts";
import { handleLocalScriptStrategy } from "../classes/handlers/handle-local-script-strategy.handler.ts";
import { toSlug } from "./to-slug.util.ts";
import { loadConfigFile } from "./load-config-file.util.ts";
import { resolvePath } from "./resolve-path.util.ts";

export interface ILoadContextOptions {
  configPath: string;
  doNotDownload: boolean;
}

async function loadContextFromDirectory(contextPath: string, options: ILoadContextOptions) {
  const mcpConfig = loadConfigFile(options.configPath, { reload: false });
  const contextJsonPath = `${contextPath}/context.json`;
  const config = readJsonFromFile<IContextConfig>(contextJsonPath);
  const context = new MCPContext();

  writeLog({ envFilePath: mcpConfig.envFile ? resolvePath(mcpConfig.envFile) : void 0 });

  const tsOptions: ITSExecuteOptions = {
    envFilePath: mcpConfig.envFile ? resolvePath(mcpConfig.envFile) : void 0,
    projectCwd: Deno.cwd(),
    importsCwd: contextPath,
    extraArguments: config.deno?.extraArguments ?? [],
    timeout: config.deno?.timeout ?? 5000,
    permissions: {
      allowedReadDirs: config.deno?.permissions?.allowedReadDirs ?? [],
      allowedWriteDirs: config.deno?.permissions?.allowedWriteDirs ?? [],
      allowNetDomains: config.deno?.permissions?.allowNetDomains ?? [],
      allowedPackages: config.deno?.permissions?.allowedPackages ?? [],
      allowedExecutables: config.deno?.permissions?.allowedExecutables ?? [],
      allowedEnvironments: config.deno?.permissions?.allowedEnvironments ?? [],
    }
  };

  await context.loadContext(contextPath, tsOptions);

  writeLog(`loadContextFromDirectory: after context.loadContext`);

  return { context, config, options: tsOptions };
}


const catchLogs = (_args: CrashIfNotArguments) => {
  writeLog(`EVENT [onInitialize] Exception`, LogLevel.ERROR);
  writeLog(_args);
};

export async function loadContext(
  context: string,
  versionOrImport: string | IImport,
  options: ILoadContextOptions,
): Promise<ILoadableServerContext | void> {
  const version = typeof versionOrImport === "string"
    ? versionOrImport
    : versionOrImport.version;

  writeLog(`loadContext: ${context}`);

  const cwd = getDirname(options.configPath);
  const contextModulesPath = `${cwd}/context_modules`;
  const contextJsonPath = `${contextModulesPath}/${context}/${version}.json`;
  const contextDirPath = `${contextModulesPath}/${context}/${version}`;

  if (exists(contextJsonPath)) {
    writeLog(`loadContext: exists(${contextJsonPath})`);
    const memoizer = new Memoizer();
    const temporizer = new Temporizer();
    const contextVersion: ContextVersion = readJsonFromFile<ContextVersion>(contextJsonPath);
    const result: ILoadableServerContext = {
      id: contextVersion.context.id,
      name: contextVersion.context.name,
      description: contextVersion.description ?? "",
      version: contextVersion.version,
      slug: contextVersion.context.slug,
      prompts: contextVersion.prompts.map((prompt): ComputablePrompt => {
        return {
          id: `${contextVersion.context.slug}:prompt:${prompt.name}`,
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments as IPromptArgument[],
          title: prompt.title,
          execute: async (args): Promise<PromptsGetResponse> => {
            return {
              messages:
                prompt.messages.map<IPromptMessage>(message => objectPick(message, ['role', 'content']) as IPromptMessage)
                  .map(message => {
                    if (message.content.type === "text") {
                      message.content.text = applyArgs(message.content.text, args);
                    }

                    return message;
                  }),
              description: prompt.description,
            };
          },
        };
      }),
      resources: contextVersion.resources.map((resource): ComputableResource => {
        return {
          id: resource.id,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType ?? "text/markdown",
          title: resource.title,
          uri: resource.uri,
          execute: async (): Promise<IResourceContent[]> => {
            return [
              {
                text: resource.text ?? void 0,
                // @ts-ignore: set text value if exists.
                blob: resource.blob ?? void 0,
                mimeType: resource.mimeType,
                uri: resource.uri
              }
            ];
          }
        };
      }),
      tools: contextVersion.tools.map((tool): ComputableTool => {
        return {
          id: tool.id,
          name: tool.name,
          description: tool.description,
          title: tool.title,
          inputSchema: tool.inputSchema ?? {},
          outputSchema: tool.outputSchema ?? {},
          execute: async (args, options, serverContext): Promise<ToolCallResponse> => {
            const { execution } = tool;
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
              const { id: toolId } = tool;

              if (config.deterministic) {
                const cachedResponse = memoizer.get([toolId, strategyId, JSON.stringify(args)]);

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
                args,
                catchLogs,
                platform,
                tool
              } satisfies StrategyHandlerContext;

              if (strategy.type === "local") {
                const cache = checkCache(strategy);

                if (cache) {
                  return cache;
                }

                temporizer.start(tool.name, tool.cooldownMs);

                const localStrategyResponse = await handleLocalStrategy.call(
                  serverContext,
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

                temporizer.start(tool.name, tool.cooldownMs);

                const localScriptStrategyResponse = await handleLocalScriptStrategy
                  .call(serverContext, context);

                if (
                  localScriptStrategyResponse === true || !localScriptStrategyResponse
                ) {
                  continue;
                }

                writeLog(localScriptStrategyResponse, LogLevel.INFO);

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
        };
      }),
    };

    return result;
  }

  if (isContextProjectFolder(contextDirPath)) {
    writeLog(`loadContext: isContextProjectFolder(${contextDirPath})`);

    const { context, config: contextFile, options: tsOptions } = await loadContextFromDirectory(contextDirPath, options);

    writeLog(`loadContext: after const context = await loadContextFromDirectory(${contextDirPath});`);
    writeLog(`loadContext: close return of (${contextDirPath})`);
    return {
      id: 0,
      name: contextFile.name,
      version: contextFile.version,
      description: contextFile.description,
      slug: contextFile.slug ?? toSlug(contextFile.name),
      tools: context.tools.map((tool): ComputableTool => {
        return {
          id: `${contextFile.name}:${contextFile.version}:${tool.name}`,
          name: tool.name,
          description: tool.description,
          title: tool.title,
          inputSchema: tool.inputSchema ?? {},
          outputSchema: tool.outputSchema ?? {},
          execute: async (args, options, serverContext): Promise<ToolCallResponse> => {
            const result = await context.executeTool(tool.name, args, tsOptions);

            return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result as Record<string, unknown> };
          }
        };
      }),
      prompts: context.prompts.map((prompt): ComputablePrompt => {
        return {
          id: `${contextFile.name}:${contextFile.version}:${prompt.name}`,
          name: prompt.name,
          description: prompt.description,
          title: prompt.title,
          execute: async (args): Promise<PromptsGetResponse> => {
            const result = await context.consumePrompt(prompt.name, args, tsOptions);

            return { messages: [{ role: Role.ASSISTANT, content: { type: "text", text: result } }], description: "" };
          }
        };
      }),
      resources: context.resources.map((resource): ComputableResource => {
        return {
          id: `${contextFile.name}:${contextFile.version}:${resource.name}`,
          name: resource.name,
          description: resource.description,
          title: resource.title,
          mimeType: resource.mimeType,
          uri: resource.uri,
          execute: async (serverContext): Promise<IResourceContent[]> => {
            const result = await context.readResource(resource.name, tsOptions);

            return [{
              text: result,
              mimeType: "text/plain",
              uri: resource.uri,
            }];
          }
        };
      })
    };
  }

  writeLog(`AFTER: ${context}`);

  if (options.doNotDownload) {
    writeLog(`DO NOT DOWNLOAD: ${context}`);
    return;
  }

  const slug = `${context}@${version}`;

  await downloadAndInstallContextBySlug(slug, {
    silent: true,
    configPath: options.configPath,
    contextModulesPath,
  });

  writeLog(`DOWNLOADED: ${context}`);

  return loadContext(context, version, options);
};