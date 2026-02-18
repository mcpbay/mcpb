import { CONTEXT_MODULES_PATH } from "../constants/context-modules-path.constant.ts";
import { crashIfNot } from "../utils/crash-if-not.util.ts";
import { downloadContext } from "../utils/download-context.util.ts";
import { saveConfiFile } from "../utils/save-config-file.util.ts";
import { existsSync } from "@std/fs";
import { saveContext } from "../utils/save-context.util.ts";
import { loadOrCreateConfigFile } from "../utils/load-or-create-config-file.util.ts";

export async function addCommand(source: string, options: Record<string, any>) {
  const { config: configPath } = options;
  const config = loadOrCreateConfigFile(configPath);
  const slugContainsVersion = source.includes("@");
  let contextSlug = [source];

  if (slugContainsVersion) {
    const [slug, version] = source.split("@");

    crashIfNot(slug, "Invalid slug format.");
    crashIfNot(version, "Invalid slug version.");

    config.imports[slug] = version;
    contextSlug = [slug, version];
  } else {
    config.imports[source] = "latest";
    contextSlug = [source, "latest"];
  }

  const contextVersion = await downloadContext(contextSlug.join("@"));

  if (!contextVersion) {
    return;
  }

  const contextModulesPath = config.contextModulesPath ?? CONTEXT_MODULES_PATH;

  if (!existsSync(contextModulesPath)) {
    Deno.mkdirSync(contextModulesPath);
  }

  const contextFolderName = contextVersion.context.slug;
  const contextFolderPath = `${contextModulesPath}/${contextFolderName}`;
  const contextVersionPath =
    `${contextFolderPath}/${contextVersion.version}.json`;

  config.imports[contextSlug[0]] = contextVersion.version;

  if (existsSync(contextFolderPath)) {
    if (existsSync(contextVersionPath)) {
      return console.log(`Context "${source}" already exists.`);
    }

    saveContext(contextVersion, contextVersionPath);
  } else {
    Deno.mkdirSync(contextFolderPath);

    saveContext(contextVersion, contextVersionPath);

    console.log(`Context "${source}" added successfully.`);
  }

  saveConfiFile(config);
}
