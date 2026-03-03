import { loadConfigFile } from "../utils/load-config-file.util.ts";
import { downloadAndInstallContextBySlug } from "../utils/download-and-install-context-by-slug.util.ts";
import { getDirname } from "../utils/get-dirname.util.ts";

export async function addCommand(source: string, options: Record<string, any>) {
  const { config: configPath, silent } = options;
  const config = loadConfigFile(configPath, { create: true });
  const cwd = getDirname(configPath);
  const contextModulesPath = `${cwd}/context_modules`;

  Deno.writeTextFileSync(`./tst.txt`, "qwdqwdqwd");

  await downloadAndInstallContextBySlug(source, { config, configPath, silent, contextModulesPath });
}
