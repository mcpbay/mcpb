import { CONFIG_FILE_PATH } from "../constants/config-file-path.constant.ts";
import { IMcpPackage } from "../interfaces/mcp-package.interface.ts";

export function saveConfiFile(config: IMcpPackage, configPath?: string) {
  Deno.writeTextFileSync(configPath ?? CONFIG_FILE_PATH, JSON.stringify(config, null, 2));
}
