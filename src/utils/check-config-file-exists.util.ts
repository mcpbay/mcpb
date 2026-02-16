import { existsSync } from "@std/fs";
import { CONFIG_FILE_PATH } from "../constants/config-file-path.constant.ts";
import { loadConfigFile } from "./load-config-file.util.ts";

export function checkConfigFileExists(path = CONFIG_FILE_PATH) {
  if (!existsSync(path)) {
    throw new Error("Config file not found.");
  }

  return loadConfigFile(path);
}
