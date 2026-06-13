import { loadContextFromGitHub } from "@mcpbay/contexts-manager";
import type { ILoadContextFromGitHubArguments } from "@mcpbay/contexts-manager";
import { toGithubUri } from "./parse-github-source.util.ts";
import { loadConfigFile } from "./load-config-file.util.ts";
import { saveConfiFile } from "./save-config-file.util.ts";
import { exists } from "./exists.util.ts";
import { getAgentsMdPath } from "./get-agents-md-path.util.ts";
import { MdManager } from "../classes/md-manager.class.ts";
import type { IMcpPackage } from "../interfaces/mcp-package.interface.ts";

export interface IDownloadAndInstallContextByGitHubOptions {
  configPath: string;
  contextModulesPath: string;
  silent?: boolean;
  config?: IMcpPackage;
  force?: boolean;
}

export interface IDownloadAndInstallContextByGitHubResponse {
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
  tools?: { path?: string; configFilePath?: string }[];
  resources?: { path?: string; configFilePath?: string }[];
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

export async function downloadAndInstallContextByGitHub(
  source: string,
  options: IDownloadAndInstallContextByGitHubOptions,
): Promise<IDownloadAndInstallContextByGitHubResponse> {
  const { configPath, contextModulesPath, force } = options;
  const config = options.config ?? loadConfigFile(configPath);

  const logMessage = (...args: any) => {
    if (options?.silent) return;
    console.log(...args);
  };

  const githubUri = toGithubUri(source);

  logMessage(`Downloading context from ${githubUri}...`);

  const context = await loadContextFromGitHub({
    source: githubUri,
    options: {
      importsCwd: Deno.cwd(),
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
    },
  } satisfies ILoadContextFromGitHubArguments);

  const contextRoot = findContextRoot(context);

  if (!contextRoot) {
    context.dispose();
    throw new Error("Unable to locate the downloaded context root directory.");
  }

  const contextJsonPath = `${contextRoot}/context.json`;

  if (!exists(contextJsonPath)) {
    context.dispose();
    throw new Error("Downloaded context does not contain a `context.json` file.");
  }

  const contextJson = JSON.parse(Deno.readTextFileSync(contextJsonPath));
  const slug = contextJson.name;
  const version = contextJson.version || "1.0.0";

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

  copyDir(contextRoot, contextFolderPath);

  config.imports[slug] = { version, ref: githubUri, type: "remote" };
  saveConfiFile(config, configPath);

  logMessage(`Context "${slug}" (${version}) added successfully from ${githubUri}.`);

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
        onSameContent: () => logMessage(`Section in 'AGENTS.md' already contains the required content.`),
        onUpdated: () => logMessage(`Section in 'AGENTS.md' updated.`),
      },
    );
  }

  context.dispose();

  const hasTypeScriptScripts = context.tools.length > 0;

  return { hasTypeScriptScripts };
}
