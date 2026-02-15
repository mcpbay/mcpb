import { CONFIG_FILE_PATH } from "../constants/config-file-path.constant.ts";
import { IMcpPackage } from "../interfaces/mcp-package.interface.ts";

export function loadConfigFile(path = CONFIG_FILE_PATH): IMcpPackage {
  return JSON.parse(Deno.readTextFileSync(CONFIG_FILE_PATH));
}