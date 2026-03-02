import { CONFIG_FILE_PATH } from "../constants/config-file-path.constant.ts";
import { jsonFromFile } from "./json-from-file.util.ts";
import { fileExists } from "./file-exists.util.ts";

export function checkConfigFileExists(path = CONFIG_FILE_PATH) {
  if (!fileExists(path)) {
    throw new Error("Config file not found.");
  }

  return jsonFromFile(path);
}
