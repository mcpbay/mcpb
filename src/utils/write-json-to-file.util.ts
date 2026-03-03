import { dirname } from "@std/path";
import { resolvePath } from "./resolve-path.util.ts";

export function writeJsonToFile(path: string, json: object) {
  const systemPath = resolvePath(path);
  const dir = dirname(systemPath);

  try {
    Deno.mkdirSync(dir, { recursive: true });
  } catch {
  }

  const jsonStr = JSON.stringify(json, null, 2);
  Deno.writeTextFileSync(systemPath, jsonStr);
}
