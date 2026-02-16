import { VERSION_CACHE_PATH } from "../constants/version-cache-path.constant.ts";
import { IVersionCache } from "../interfaces/version-check.interface.ts";

interface ISaveVersionCacheArguments {
  // Whether the version is outdated
  isOutdated: boolean;
  // The current version of the CLI
  currentVersion: string;
  // The latest version available
  latestVersion: string;
}

export async function saveVersionCache(args: ISaveVersionCacheArguments) {
  const { isOutdated, currentVersion, latestVersion } = args;

  const cache = {
    isOutdated,
    currentVersion,
    latestVersion,
    checkedAt: new Date().toISOString(),
  } satisfies IVersionCache;

  const cacheJson = JSON.stringify(cache, null, 2);

  await Deno.writeTextFile(VERSION_CACHE_PATH, cacheJson);
}
