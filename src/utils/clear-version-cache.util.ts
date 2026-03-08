import { VERSION_CACHE_PATH } from "../constants/version-cache-path.constant.ts";
import { exists } from "./exists.util.ts";

// [BY-AI] Clears the version cache file if it exists
// Useful for forcing a fresh version check on the next CLI run
export async function clearVersionCache() {
  const cacheFileExists = exists(VERSION_CACHE_PATH);

  if (cacheFileExists) {
    await Deno.remove(new URL(VERSION_CACHE_PATH));
  }
}
