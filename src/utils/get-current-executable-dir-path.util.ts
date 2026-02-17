import * as path from "jsr:@std/path";

export function getCurrentExecutableDirPath() {
  const executableDir = path.dirname(Deno.execPath()).replaceAll("\\", "/");

  return executableDir;
}
