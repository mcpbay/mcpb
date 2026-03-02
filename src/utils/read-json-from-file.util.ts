import { readTextFile } from "./read-text-file.util.ts";

export function readJsonFromFile<T>(path: string): T {
  const json = readTextFile(path);
  return JSON.parse(json) as T;
}
