import type { IMcpPackage } from "../interfaces/mcp-package.interface.ts";
import { CONFIG_FILE_PATH } from "../constants/config-file-path.constant.ts";
import { jsonFromFile } from "./json-from-file.util.ts";
import { loadEnv } from "./load-env.util.ts";
import { fileExists } from "./file-exists.util.ts";
import { writeLog } from "./write-log.util.ts";

export interface ILoadConfigFileOptions {
  create: boolean;
  reload: boolean;
}

let config: IMcpPackage | null = null;

export function loadConfigFile(path = CONFIG_FILE_PATH, options?: Partial<ILoadConfigFileOptions>) {
  writeLog("loadConfigFile");

  const readConfigFileContent = (() => {
    if (fileExists(path)) {
      writeLog(`fileExists(${path})`);
      return jsonFromFile<IMcpPackage>(path);
    }

    writeLog(`!fileExists(${path})`);

    if (options?.create) {
      return createConfigFile(path) as IMcpPackage;
    }

    return { imports: {} } satisfies IMcpPackage;
  });

  if (options?.reload) {
    config = readConfigFileContent();
  } else {
    config ??= readConfigFileContent();
  }

  if (config.env) {
    for (const [key, value] of Object.entries(config.env)) {
      Deno.env.set(key, value);
    }
  }

  if (config.envFile) {
    loadEnv(config.envFile);
  }

  return config;
}

function createConfigFile(path: string) {
  const config = { imports: {} };

  Deno.writeTextFileSync(new URL(path), JSON.stringify(config, null, 2));

  return config;
}
