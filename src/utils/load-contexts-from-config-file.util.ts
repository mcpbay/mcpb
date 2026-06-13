import { type IImport } from "../interfaces/mcp-package.interface.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { loadContext } from "./load-context.util.ts";
import { writeLog } from "./write-log.util.ts";
import { loadConfigFile } from "./load-config-file.util.ts";

export async function loadContextsFromConfigFile(
  configPath: string,
  create = true,
) {
  writeLog("loadContextsFromConfigFile");

  const contexts: ContextVersion[] = [];
  const config = loadConfigFile(configPath, { create, reload: true });

  writeLog("config");
  writeLog(config);

  for (const [slug, versionOrImport] of Object.entries(config.imports)) {
    const context = (await loadContext(
      slug,
      versionOrImport as string | IImport,
      { configPath, doNotDownload: true },
    ))!;

    if (context) {
      contexts.push(context);
    }
  }

  return contexts;
}
