import { VERSION_CACHE_PATH } from "../constants/version-cache-path.constant.ts";
import { fileExists } from "./file-exists.util.ts";

// [BY-AI] Clears the version cache file if it exists
// Useful for forcing a fresh version check on the next CLI run
export async function clearVersionCache() {
  const cacheFileExists = fileExists(VERSION_CACHE_PATH);

  if (cacheFileExists) {
    await Deno.remove(VERSION_CACHE_PATH);
  }
}
