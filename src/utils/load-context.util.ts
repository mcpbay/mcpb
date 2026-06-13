import { type IImport } from "../interfaces/mcp-package.interface.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { downloadAndInstallContextBySlug } from "./download-and-install-context-by-slug.util.ts";
import { exists } from "./exists.util.ts";
import { writeLog } from "./write-log.util.ts";
import { getDirname } from "./get-dirname.util.ts";
import { readJsonFromFile } from "./read-json-from-file.util.ts";
import { type IContextConfig, MCPContext } from "@mcpbay/contexts-manager";

export interface ILoadContextOptions {
  configPath: string;
  doNotDownload: boolean;
}

function parseFrontMatter(
  content: string,
): { data: Record<string, unknown>; content: string } {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") {
    return { data: {}, content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { data: {}, content };
  }

  const frontMatterLines = lines.slice(1, endIndex);
  const data: Record<string, unknown> = {};
  for (const line of frontMatterLines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      let value: unknown = line.slice(colonIndex + 1).trim();
      const strValue = String(value);

      if (strValue.startsWith("[") && strValue.endsWith("]")) {
        try {
          value = JSON.parse(strValue);
        } catch {
          value = strValue.slice(1, -1).split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
        }
      } else if (strValue.startsWith('"') && strValue.endsWith('"')) {
        value = strValue.slice(1, -1);
      }

      data[key] = value;
    }
  }

  return {
    data,
    content: lines.slice(endIndex + 1).join("\n").trim(),
  };
}

async function loadContextFromDirectory(contextPath: string): Promise<ContextVersion> {
  const contextJsonPath = `${contextPath}/context.json`;
  const config = readJsonFromFile<IContextConfig>(contextJsonPath);
  const context = new MCPContext();

  await context.loadContext(contextPath, {
    projectCwd: Deno.cwd(),
    importsCwd: Deno.cwd(),
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
  });

  const mapTool = async (tool: unknown): Promise<Record<string, unknown>> => {
    const toolObj = tool as Record<string, unknown>;
    const toolPath = toolObj.path as string | undefined;
    const configFilePath = toolObj.configFilePath as string | undefined;
    let code = "";

    if (toolPath) {
      code = await Deno.readTextFile(toolPath);
    }

    return {
      name: toolObj.name,
      description: toolObj.description ?? "",
      title: toolObj.title ?? "",
      id: crypto.randomUUID(),
      status: "active",
      inputSchema: toolObj.inputSchema ?? null,
      outputSchema: toolObj.outputSchema ?? null,
      execution: [
        {
          id: crypto.randomUUID(),
          type: "local-script",
          priority: null,
          config: {
            tags: [],
            invalidateTags: [],
            maxOutputSize: 1048576,
            deterministic: false,
            placeholders: [],
            outputMapping: null,
            timeout: config.deno?.timeout ?? 30000,
            language: "ts",
            code,
            allowReadProject: true,
            allowWriteProject: true,
            allowedDomains: config.deno?.permissions?.allowNetDomains ?? [],
            allowedPackages: config.deno?.permissions?.allowedPackages ?? [],
            allowedEnvironments: config.deno?.permissions?.allowedEnvironments ?? [],
            allowedAppsToExecute: config.deno?.permissions?.allowedExecutables ?? [],
            configFilePath,
          },
        },
      ],
      permissions: {
        network: (config.deno?.permissions?.allowNetDomains?.length ?? 0) > 0,
        filesystemRead: true,
        filesystemWrite: true,
        privileged: false,
      },
      cooldownMs: 1000,
    };
  };

  function normalizeUri(uri: unknown): string {
    if (typeof uri !== "string") return "";
    if (uri.startsWith("file://")) return uri;
    const normalized = uri.replace(/\\/g, "/");
    return `file:///${normalized}`;
  }

  const mapResource = async (resource: unknown): Promise<Record<string, unknown>> => {
    const res = resource as Record<string, unknown>;
    const resourcePath = res.path as string | undefined;

    if (!resourcePath) {
      return res;
    }

    const raw = await Deno.readTextFile(resourcePath);
    const { data, content } = parseFrontMatter(raw);

    return {
      ...res,
      text: content || raw,
      title: res.title ?? (data.title as string) ?? "",
      mimeType: res.mimeType ?? (data.mimeType as string) ?? "text/markdown",
      description: res.description ?? (data.description as string) ?? "",
      uri: normalizeUri(res.uri),
    };
  };

  const findPromptFile = async (
    promptName: string,
    promptsDir: string,
  ): Promise<string | undefined> => {
    const entries: string[] = [];

    const walkDir = async (dir: string) => {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}/${entry.name}`;
        if (entry.isDirectory && !entry.name.startsWith("@")) {
          await walkDir(fullPath);
        } else if (entry.isFile && entry.name.endsWith(".md")) {
          entries.push(fullPath);
        }
      }
    };

    try {
      await walkDir(promptsDir);

      for (const filePath of entries) {
        const raw = await Deno.readTextFile(filePath);
        const { data } = parseFrontMatter(raw);
        if (data.name === promptName) {
          return filePath;
        }
      }
    } catch {}

    return undefined;
  };

  const mapPrompt = async (prompt: unknown): Promise<Record<string, unknown>> => {
    const p = prompt as Record<string, unknown>;
    const promptName = p.name as string;
    const promptsDir = `${contextPath}/prompts`;
    const promptPath = await findPromptFile(promptName, promptsDir);

    if (!promptPath) {
      return p;
    }

    const raw = await Deno.readTextFile(promptPath);
    const { data, content } = parseFrontMatter(raw);

    return {
      ...p,
      arguments: Array.isArray(data.arguments) ? data.arguments : [],
      messages: [
        {
          role: "user",
          content: { type: "text", text: content || raw },
        },
      ],
    };
  };

  const tools = await Promise.all(context.tools.map(mapTool));
  const resources = await Promise.all(context.resources.map(mapResource));
  const prompts = await Promise.all(context.prompts.map(mapPrompt));

  return {
    version: config.version,
    description: config.description,
    prompt: "",
    prompts: prompts as unknown as ContextVersion["prompts"],
    resources: resources as unknown as ContextVersion["resources"],
    tools: tools as unknown as ContextVersion["tools"],
    variables: [],
  } as unknown as ContextVersion;
}

export async function loadContext(
  context: string,
  versionOrImport: string | IImport,
  options: ILoadContextOptions,
) {
  const version = typeof versionOrImport === "string"
    ? versionOrImport
    : versionOrImport.version;

  writeLog("loadContext");
  const cwd = getDirname(options.configPath);
  const contextModulesPath = `${cwd}/context_modules`;
  const contextJsonPath = `${contextModulesPath}/${context}/${version}.json`;
  const contextDirPath = `${contextModulesPath}/${context}/${version}`;
  writeLog({ contextModulesPath, contextJsonPath });

  if (exists(contextJsonPath)) {
    return readJsonFromFile<ContextVersion>(contextJsonPath);
  }

  if (exists(contextDirPath, true)) {
    return loadContextFromDirectory(contextDirPath);
  }

  if (options.doNotDownload) {
    return;
  }

  await downloadAndInstallContextBySlug(`${context}@${version}`, {
    silent: true,
    configPath: options.configPath,
    contextModulesPath,
  });

  return readJsonFromFile<ContextVersion>(contextJsonPath);
}
