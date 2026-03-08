import { CONFIG_FILE_PATH } from "../constants/config-file-path.constant.ts";
import { exists } from "./exists.util.ts";
import { readJsonFromFile } from "./read-json-from-file.util.ts";

export function checkConfigFileExists(path = CONFIG_FILE_PATH) {
  if (!exists(path)) {
    throw new Error("Config file not found.");
  }

  return readJsonFromFile(path);
}
