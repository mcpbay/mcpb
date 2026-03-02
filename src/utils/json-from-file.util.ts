import { readTextFile } from "./read-text-file.util.ts";
import { writeLog } from "./write-log.util.ts";

export function jsonFromFile<T>(path: string): T {
  writeLog(`jsonFromFile: ${path}`);
  return JSON.parse(readTextFile(path));
}
