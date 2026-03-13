import { dirname } from "@std/path";
import { exists } from "./exists.util.ts";
import { readJsonFromFile } from "./read-json-from-file.util.ts";

export function readOrCreateJsonFile<T extends object>(filePath: string, json: T) {
  if (exists(filePath)) {
    return { created: false, json: readJsonFromFile<T>(filePath) };
  }

  const fileDir = dirname(filePath);

  try {
    Deno.mkdirSync(fileDir, { recursive: true });
  } catch {
  }

  const stringifiedJson = JSON.stringify(json, null, 2);

  Deno.writeTextFileSync(filePath, stringifiedJson, { create: true });

  return { created: true, json };
}