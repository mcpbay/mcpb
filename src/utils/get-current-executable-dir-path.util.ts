import { getDirname } from "./get-dirname.util.ts";

export function getCurrentExecutableDirPath() {
  const executableDir = getDirname(Deno.execPath()).replaceAll("\\", "/");

  return executableDir;
}
