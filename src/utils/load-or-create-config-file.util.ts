import { existsSync } from "@std/fs/exists";
import { CONFIG_FILE_PATH } from "../constants/config-file-path.constant.ts";
import { loadConfigFile } from "./load-config-file.util.ts";
import type { IMcpPackage } from "../interfaces/mcp-package.interface.ts";

export function loadOrCreateConfigFile(path = CONFIG_FILE_PATH) {
  if (existsSync(path)) {
    return loadConfigFile(path);
  }

  return createConfigFile(path) as IMcpPackage;
}

function createConfigFile(path: string) {
  const config = {
    imports: {},
  };

  Deno.writeTextFileSync(path, JSON.stringify(config, null, 2));

  return config;
}
