import { VERSION_CACHE_PATH } from "../constants/version-cache-path.constant.ts";
import { IVersionCache } from "../interfaces/version-check.interface.ts";
import { exists } from "./exists.util.ts";

export async function loadVersionCache() {
  const cacheFileExists = exists(VERSION_CACHE_PATH);

  if (!cacheFileExists) {
    return null;
  }

  try {
    const cacheContent = await Deno.readTextFile(new URL(VERSION_CACHE_PATH));
    const cache = JSON.parse(cacheContent) as IVersionCache;

    return cache;
  } catch {
    return null;
  }
}
