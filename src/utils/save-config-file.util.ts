import { CONFIG_FILE_PATH } from "../constants/config-file-path.constant.ts";
import { IMcpPackage } from "../interfaces/mcp-package.interface.ts";
import { writeJsonToFile } from "./write-json-to-file.util.ts";

export function saveConfiFile(config: IMcpPackage, configPath: string = CONFIG_FILE_PATH) {
  writeJsonToFile(configPath, config);
}
