import { loadSync } from "@std/dotenv";
import { fileExists } from "./file-exists.util.ts";

const envsRead = new Set<string>();

export function loadEnv(path: string) {
  if (!envsRead.has(path)) {
    envsRead.add(path);

    if (!fileExists(path)) {
      console.log(`Env \`${path}\` does not exist. Skipping...`);

      return;
    }

    loadSync({ envPath: path, export: true });
  }
}