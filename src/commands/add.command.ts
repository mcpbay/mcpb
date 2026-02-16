import { CONTEXT_MODULES_PATH } from "../constants/context-modules-path.constant.ts";
import { checkConfigFileExists } from "../utils/check-config-file-exists.util.ts";
import { crashIfNot } from "../utils/crash-if-not.util.ts";
import { downloadContext } from "../utils/download-context.util.ts";
import { saveConfiFile } from "../utils/save-config-file.util.ts";
import { existsSync } from "@std/fs";
import { saveContext } from "../utils/save-context.util.ts";
import { loadOrCreateConfigFile } from "../utils/load-or-create-config-file.util.ts";

export async function addCommand(source: string) {
  const config = loadOrCreateConfigFile();
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
