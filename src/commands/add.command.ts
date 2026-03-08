import { loadConfigFile } from "../utils/load-config-file.util.ts";
import { downloadAndInstallContextBySlug } from "../utils/download-and-install-context-by-slug.util.ts";
import { getDirname } from "../utils/get-dirname.util.ts";
import { UniversalAppChecker } from "../classes/universal-app-checker.class.ts";
import { getForEveryOS } from "../utils/get-for-every-os.util.ts";

export async function addCommand(source: string, options: Record<string, any>) {
  const { config: configPath, silent, force } = options;
  const config = loadConfigFile(configPath, { create: true });
  const cwd = getDirname(configPath);
  const contextModulesPath = `${cwd}/context_modules`;
  const { hasTypeScriptScripts } = await downloadAndInstallContextBySlug(
    source,
    {
      config,
      configPath,
      silent,
      contextModulesPath,
      force,
    },
  );

  if (hasTypeScriptScripts) {
    const appChecker = new UniversalAppChecker();
    const denoAppInfo = await appChecker.checkApp("deno");

    if (!denoAppInfo.exists) {
      const linuxDenoInstallCmd =
        "curl -fsSL https://deno.land/install.sh | sh";
      const denoInstallationLink = getForEveryOS({
        windows: "irm https://deno.land/install.ps1 | iex",
        darwin: linuxDenoInstallCmd,
        linux: linuxDenoInstallCmd,
        unknown: linuxDenoInstallCmd,
      });

      console.log(`TypeScript scripts detected for this context!`);
      console.log(
        `To run some of the tools you need the Deno JavaScript/TypeScript runtime installed in your system.`,
      );
      console.log(`Please install it before trying to use the context tools:`);
      console.log(`  ${denoInstallationLink}`);
      console.log(`Official website: https://deno.com/`);
    }
  }
}
