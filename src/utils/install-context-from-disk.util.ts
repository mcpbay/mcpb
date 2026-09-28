import { type IMcpPackage } from "../interfaces/mcp-package.interface.ts";
import { MCPContext, fixImports, type IDenoJson } from "@mcpbay/contexts-manager";
import { exists } from "./exists.util.ts";
import { loadConfigFile } from "./load-config-file.util.ts";
import { saveConfiFile } from "./save-config-file.util.ts";
import { getAgentsMdPath } from "./get-agents-md-path.util.ts";
import { MdManager } from "../classes/md-manager.class.ts";
import { readJsonFromFile } from "./read-json-from-file.util.ts";
import { writeJsonToFile } from "./write-json-to-file.util.ts";

export interface IInstallContextFromDiskOptions {
  configPath: string;
  contextModulesPath: string;
  config?: IMcpPackage;
  force?: boolean;
  silent?: boolean;
}

export interface IInstallContextFromDiskResponse {
  hasTypeScriptScripts: boolean;
}

function copyDir(src: string, dest: string) {
  Deno.mkdirSync(dest, { recursive: true });

  for (const entry of Deno.readDirSync(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;

    if (entry.isDirectory) {
      copyDir(srcPath, destPath);
    } else {
      Deno.copyFileSync(srcPath, destPath);
    }
  }
}

function findContextRoot(context: {
  tools?: { path?: string; configFilePath?: string; }[];
  resources?: { path?: string; configFilePath?: string; }[];
}): string | null {
  for (const tool of context.tools ?? []) {
    if (tool.path) {
      const parts = tool.path.replace(/\\/g, "/").split("/");
      if (parts.length >= 2) {
        return parts.slice(0, -2).join("/");
      }
    }
    if (tool.configFilePath) {
      const parts = tool.configFilePath.replace(/\\/g, "/").split("/");
      return parts.slice(0, -1).join("/");
    }
  }

  for (const resource of context.resources ?? []) {
    if (resource.path) {
      const parts = resource.path.replace(/\\/g, "/").split("/");
      if (parts.length >= 2) {
        return parts.slice(0, -2).join("/");
      }
    }
    if (resource.configFilePath) {
      const parts = resource.configFilePath.replace(/\\/g, "/").split("/");
      return parts.slice(0, -1).join("/");
    }
  }

  return null;
}

export async function installContextFromDisk(
  source: string,
  options: IInstallContextFromDiskOptions,
): Promise<IInstallContextFromDiskResponse> {
  const { configPath, contextModulesPath, force } = options;
  const config = options.config ?? loadConfigFile(options.configPath);

  const logMessage = (...args: any) => {
    if (options?.silent) {
      return;
    }

    console.log(...args);
  };

  logMessage(`Loading context from "${source}"...`);
  const context = new MCPContext();

  const contextConfig = await context.loadContext(source, {
    importsCwd: source,
    projectCwd: Deno.cwd(),
    permissions: {
      allowedReadDirs: [],
      allowedWriteDirs: [],
      allowNetDomains: [],
      allowedPackages: [],
      allowedExecutables: [],
      allowedEnvironments: [],
    },
    extraArguments: [],
    timeout: 30000,
  });

  const slug = contextConfig.name;
  const version = contextConfig.version ?? "1.0.0";

  if (!slug) {
    context.dispose();
    throw new Error("The context.json must have a valid `name` field.");
  }

  if (config.imports[slug] && !force) {
    logMessage(`Context "${slug}" already exists.`);
    logMessage(`Use \`--force\` to force the context installation.`);
    context.dispose();

    return { hasTypeScriptScripts: context.tools.length > 0 };
  }

  const contextFolderPath = `${contextModulesPath}/${slug}/${version}`;

  if (!exists(contextModulesPath, true)) {
    Deno.mkdirSync(contextModulesPath, { recursive: true });
  }

  if (exists(contextFolderPath, true)) {
    if (!force) {
      logMessage(`Context "${slug}" version ${version} already exists.`);
      logMessage(`Use \`--force\` to force the context installation.`);
      context.dispose();

      return { hasTypeScriptScripts: context.tools.length > 0 };
    }

    Deno.removeSync(contextFolderPath, { recursive: true });
  }

  Deno.mkdirSync(contextFolderPath, { recursive: true });
  copyDir(source, contextFolderPath);

  const contextFolderDenoJsonPath = `${contextFolderPath}/deno.json`;

  logMessage(contextFolderDenoJsonPath);

  if (exists(contextFolderDenoJsonPath)) {
    logMessage(`Updating 'deno.json' file...`);
    logMessage(`exists(${contextFolderDenoJsonPath})`);
    const denoJson = readJsonFromFile<IDenoJson>(contextFolderDenoJsonPath);

    denoJson.imports = fixImports(denoJson.imports ?? {}, source);
    logMessage(denoJson.imports);

    writeJsonToFile(contextFolderDenoJsonPath, denoJson);
  }

  config.imports[slug] = { version, ref: source, type: "local" };
  saveConfiFile(config, configPath);

  logMessage(`Context "${slug}" (${version}) added successfully from "${source}".`);

  if (context.tools.length > 0) {
    logMessage(`Context "${slug}" provides ${context.tools.length} tool(s).`);
  }

  if (context.resources.length > 0) {
    logMessage(`Context "${slug}" provides ${context.resources.length} resource(s).`);
  }

  if (context.agents) {
    const agentsMdPath = getAgentsMdPath();
    const mdManager = new MdManager(agentsMdPath);
    const contextVersionPromptTitle = `MCPBay - \`${slug}\` prompt`;

    logMessage(`AGENTS.md content detected for context '${slug}'.`);
    logMessage(`Injecting '${slug}' content into 'AGENTS.md' file.`);

    mdManager.updateOrCreateSection(
      contextVersionPromptTitle,
      context.agents,
      {
        onCreated: () => logMessage(`Section added to 'AGENTS.md' file.`),
        onSameContent: () =>
          logMessage(`Section in 'AGENTS.md' already contains the required content.`),
        onUpdated: () => logMessage(`Section in 'AGENTS.md' updated.`),
      },
    );
  }

  context.dispose();

  const hasTypeScriptScripts = context.tools.length > 0;

  return { hasTypeScriptScripts };
}
