import { loadContext } from "./load-context.util.ts";
import { loadConfigFile } from "./load-config-file.util.ts";
import { ILoadableServerContext } from "../classes/mcp-server-context.class.ts";
import { writeLog } from "./write-log.util.ts";

export async function loadContextsFromConfigFile(
  configPath: string,
  create = true,
): Promise<ILoadableServerContext[]> {
  const contexts: ILoadableServerContext[] = [];
  const config = loadConfigFile(configPath, { create, reload: true });

  for (const [slug, versionOrImport] of Object.entries(config.imports)) {
    const context = await loadContext(
      slug,
      versionOrImport,
      { configPath, doNotDownload: true },
    );

    if (context) {
      contexts.push(context);
      writeLog(`loadContextsFromConfigFile: contexts.push(${context.name})`);
    }
  }

  writeLog(`return ${contexts.map(c => c.name).join(", ")}`);

  return contexts;
}
