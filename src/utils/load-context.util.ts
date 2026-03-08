import { ContextVersion } from "../types/context-version.type.ts";
import { downloadAndInstallContextBySlug } from "./download-and-install-context-by-slug.util.ts";
import { exists } from "./exists.util.ts";
import { writeLog } from "./write-log.util.ts";
import { getDirname } from "./get-dirname.util.ts";
import { readJsonFromFile } from "./read-json-from-file.util.ts";

export interface ILoadContextOptions {
  configPath: string;
}

export async function loadContext(
  context: string,
  version: string,
  options: ILoadContextOptions,
) {
  writeLog("loadContext");
  const cwd = getDirname(options.configPath);
  const contextModulesPath = `${cwd}/context_modules`;
  const contextPath = `${contextModulesPath}/${context}/${version}.json`;
  writeLog({ contextModulesPath, contextPath });

  if (!exists(contextPath)) {
    await downloadAndInstallContextBySlug(`${context}@${version}`, {
      silent: true,
      configPath: options.configPath,
      contextModulesPath,
    });
  }

  return readJsonFromFile<ContextVersion>(contextPath);
}
