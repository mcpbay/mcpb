import { getBasename } from "../utils/get-basename.util.ts";

export function isCompiled(): boolean {
  const exec = Deno.execPath();
  const file = getBasename(exec);

  return !file.includes("deno");
}
