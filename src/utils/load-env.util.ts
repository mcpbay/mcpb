import { loadSync } from "@std/dotenv";
import { exists } from "./exists.util.ts";

const envsRead = new Set<string>();

export function loadEnv(path: string) {
  if (!envsRead.has(path)) {
    envsRead.add(path);

    if (!exists(path)) {
      console.log(`Env \`${path}\` does not exist. Skipping...`);

      return;
    }

    loadSync({ envPath: path, export: true });
  }
}
