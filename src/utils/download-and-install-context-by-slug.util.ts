import { dirname } from "@std/path";
import { CONTEXT_MODULES_PATH } from "../constants/context-modules-path.constant.ts";
import { IMcpPackage } from "../interfaces/mcp-package.interface.ts";
import { crashIfNot } from "./crash-if-not.util.ts";
import { downloadContext } from "./download-context.util.ts";
import { fileExists } from "./file-exists.util.ts";
import { loadConfigFile } from "./load-config-file.util.ts";
import { saveConfiFile } from "./save-config-file.util.ts";
import { saveContext } from "./save-context.util.ts";
import { writeLog } from "./write-log.util.ts";

export interface IDownloadAndInstallContextBySlugOptions {
  configPath: string;
  contextModulesPath: string;
  silent?: boolean;
  config?: IMcpPackage;
}

export async function downloadAndInstallContextBySlug(slug: string, options: IDownloadAndInstallContextBySlugOptions) {
  writeLog("downloadAndInstallContextBySlug");
  writeLog(options);
  const { contextModulesPath } = options;
  const config = options.config ?? loadConfigFile(options.configPath);
  const slugContainsVersion = slug.includes("@");
  let contextSlug = [slug];

  const log = (...args: any) => {
    if (options?.silent) {
      return;
    }

    console.log(...args);
  };

  if (slugContainsVersion) {
    const [_slug, version] = slug.split("@");

    crashIfNot(_slug, "Invalid slug format.");
    crashIfNot(version, "Invalid slug version.");

    config.imports[_slug] = version;
    contextSlug = [_slug, version];
  } else {
    config.imports[slug] = "latest";
    contextSlug = [slug, "latest"];
  }

  const fullContextSlug = contextSlug.join("@");

  log(`Downloading ${fullContextSlug}.`);

  const contextVersion = await downloadContext(fullContextSlug);

  if (!contextVersion) {
    console.error(`Error downloading context version.`);
    console.error(JSON.stringify(contextVersion));

    return;
  }

  if (!fileExists(contextModulesPath)) {
    Deno.mkdirSync(contextModulesPath);
  }

  const contextFolderName = contextVersion.context.slug;
  const contextFolderPath = `${contextModulesPath}/${contextFolderName}`;
  const contextVersionPath =
    `${contextFolderPath}/${contextVersion.version}.json`;

  config.imports[contextSlug[0]] = contextVersion.version;

  if (fileExists(contextFolderPath)) {
    if (fileExists(contextVersionPath)) {
      return log(`Context "${slug}" already exists.`);
    }

    saveContext(contextVersion, contextVersionPath);
  } else {
    Deno.mkdirSync(contextFolderPath);

    saveContext(contextVersion, contextVersionPath);
    log(`Context "${slug}" added successfully.`);
  }

  saveConfiFile(config);
}