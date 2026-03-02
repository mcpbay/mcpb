import { dirname } from "@std/path";
import { addCommand } from "../commands/add.command.ts";
import { CONTEXT_MODULES_PATH } from "../constants/context-modules-path.constant.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { downloadAndInstallContextBySlug } from "./download-and-install-context-by-slug.util.ts";
import { fileExists } from "./file-exists.util.ts";
import { jsonFromFile } from "./json-from-file.util.ts";
import { readTextFile } from "./read-text-file.util.ts";
import { writeLog } from "./write-log.util.ts";

export interface ILoadContextOptions {
  configPath: string;
}

export async function loadContext(
  context: string,
  version: string,
  options: ILoadContextOptions
) {
  writeLog("loadContext");
  const cwd = dirname(options.configPath);
  const contextModulesPath = `${cwd}/context_modules`;
  const contextPath = `${contextModulesPath}/${context}/${version}.json`;
  writeLog({ contextModulesPath, contextPath });

  if (!fileExists(contextPath)) {
    await downloadAndInstallContextBySlug(`${context}@${version}`, { silent: true, configPath: options.configPath, contextModulesPath });
  }

  return jsonFromFile<ContextVersion>(contextPath);
}
