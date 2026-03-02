import { loadConfigFile } from "../utils/load-config-file.util.ts";
import { downloadAndInstallContextBySlug } from "../utils/download-and-install-context-by-slug.util.ts";
import { dirname } from "@std/path";

export async function addCommand(source: string, options: Record<string, any>) {
  const { config: configPath, silent } = options;
  const config = loadConfigFile(configPath, { create: true });
  const cwd = dirname(options.configPath);
  const contextModulesPath = `${cwd}/context_modules`;

  await downloadAndInstallContextBySlug(source, { config, configPath, silent, contextModulesPath });
}
