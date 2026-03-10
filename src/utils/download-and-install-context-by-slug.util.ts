import { MdManager } from "../classes/md-manager.class.ts";
import { IMcpPackage } from "../interfaces/mcp-package.interface.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { ToolLocalScriptStrategyConfig } from "../types/tool-local-script-strategy-config.type.ts";
import { compareVersions } from "./compare-versions.util.ts";
import { crashIfNot } from "./crash-if-not.util.ts";
import { downloadContext } from "./download-context.util.ts";
import { exists } from "./exists.util.ts";
import { getAgentsMdPath } from "./get-agents-md-path.util.ts";
import { loadConfigFile } from "./load-config-file.util.ts";
import { loadContext } from "./load-context.util.ts";
import { saveConfiFile } from "./save-config-file.util.ts";
import { saveContext } from "./save-context.util.ts";
import { writeLog } from "./write-log.util.ts";

export interface IDownloadAndInstallContextBySlugOptions {
  configPath: string;
  contextModulesPath: string;
  silent?: boolean;
  config?: IMcpPackage;
  force?: boolean;
}

export interface IDownloadAndInstallContextBySlugResponse {
  hasTypeScriptScripts: boolean;
}

function normalizeSlug(slug: string) {
  const slugContainsVersion = slug.includes("@");
  let contextSlug = { slug, version: "latest", fullSlug: `${slug}@latest` };

  if (slugContainsVersion) {
    const [_slug, version] = slug.split("@");

    crashIfNot(_slug, "Invalid slug: empty slug.");
    crashIfNot(version, "Invalid slug version: empty version.");

    contextSlug = { slug: _slug, version, fullSlug: `${_slug}@${version}` };
  }

  return contextSlug;
}

function checkToolScripts(contextVersion: ContextVersion) {
  const hasTypeScriptScripts = contextVersion.tools.some((tool) => {
    for (const executionStrategy of tool.execution) {
      if (executionStrategy.type === "local-script") {
        const config = executionStrategy
          .config as ToolLocalScriptStrategyConfig;

        return config.language === "ts";
      }
    }
  });

  return hasTypeScriptScripts;
}

export async function downloadAndInstallContextBySlug(
  slug: string,
  options: IDownloadAndInstallContextBySlugOptions,
): Promise<IDownloadAndInstallContextBySlugResponse> {
  const { contextModulesPath, force } = options;
  const config = options.config ?? loadConfigFile(options.configPath);
  const isContextPresent = !!config.imports[slug];

  const log = (...args: any) => {
    if (options?.silent) {
      return;
    }

    console.log(...args);
  };

  const { slug: realSlug, version: realVersion, fullSlug } = normalizeSlug(slug);
  const currentContextVersion = config.imports[realSlug];

  /**
   * Alex: pre-verify the versions.
   */
  if (isContextPresent && !force) {

    if (realVersion !== "latest") {
      const comparison = compareVersions({
        current: currentContextVersion,
        latest: realVersion,
      });

      if (comparison === 0) {
        log(`Context "${slug}" already exists.`);
        log(`Use \`mcpb add ${fullSlug} --force\` to force the context installation.`);

        const contextVersion =
          await loadContext(slug, realVersion, { configPath: options.configPath, doNotDownload: true });

        if (!contextVersion) {
          console.error(`Error loading context version '${fullSlug}': Context version does not exists in disk.`);
          return { hasTypeScriptScripts: false };
        }

        const hasTypeScriptScripts = checkToolScripts(contextVersion);

        return { hasTypeScriptScripts };
      } else if (comparison < 0) {
        log(`Context "${fullSlug}" is out of date.`);
        log(`Use \`mcpb add ${fullSlug} --force\` to force the context installation.`);

        return { hasTypeScriptScripts: false };
      }
    }
  }

  log(`Downloading ${fullSlug}...`);

  const contextVersion =
    await downloadContext(fullSlug);

  log(`Context ${fullSlug} downloaded successfully.`);

  if (!contextVersion) {
    console.error(`Error downloading context version.`);
    console.error(JSON.stringify(contextVersion));

    return { hasTypeScriptScripts: false };
  }

  if (!exists(contextModulesPath, true)) {
    Deno.mkdirSync(contextModulesPath);
  }

  const contextFolderPath = `${contextModulesPath}/${realSlug}`;
  const contextVersionPath = `${contextFolderPath}/${contextVersion.version}.json`;
  config.imports[realSlug] = contextVersion.version;

  if (exists(contextFolderPath, true)) {
    if (exists(contextVersionPath) && !force) {
      log(`Context "${slug}" already exists.`);
      log(`Use \`mcpb add ${fullSlug} --force\` to force the context installation.`);
      const hasTypeScriptScripts = checkToolScripts(contextVersion);
      return { hasTypeScriptScripts: hasTypeScriptScripts };
    }
  } else {
    Deno.mkdirSync(contextFolderPath);
  }

  saveContext(contextVersion, contextVersionPath);
  log(`Context "${slug}" added successfully.`);
  saveConfiFile(config);

  const agentsMdPath = getAgentsMdPath();
  const mdManager = new MdManager(agentsMdPath);
  const contextVersionPrompt = contextVersion.prompt;

  if (contextVersionPrompt) {
    const contextVersionPromptTitle = `MCPBay - \`${realSlug}\` prompt`;
    log(`Injectable prompt detected  for context '${slug}'.`);

    /**
     * Alex: this means the context was previously found on disk before install it.
     */
    if (isContextPresent) {
      log(`Previous prompt found for context '${slug}'. Updating it...`);
    } else {
      log(`Injecting '${fullSlug}' prompt into 'AGENTS.md' file.`);
    }

    mdManager.updateOrCreateSection(
      contextVersionPromptTitle,
      contextVersionPrompt, {
      onCreated: (section) => log(`Section '${section.title}' added to 'AGENTS.md' file.`),
      onSameContent: (section) => log(`Section '${section.title}' in 'AGENTS.md' already contains the required prompt to work correctly.`),
      onUpdated: (section) => log(`Section '${section.title}' in 'AGENTS.md' updated and required prompt content added.`),
    });
  }

  const hasTypeScriptScripts = checkToolScripts(contextVersion);

  return { hasTypeScriptScripts };
}
