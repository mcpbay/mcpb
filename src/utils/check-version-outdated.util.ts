import { getVersion } from "./get-version.util.ts";
import { loadVersionCache } from "./load-version-cache.util.ts";
import { saveVersionCache } from "./save-version-cache.util.ts";
import { compareVersions } from "./compare-versions.util.ts";
import { IVersionCheckResult } from "../interfaces/version-check.interface.ts";

// [BY-AI] Represents the structure of a GitHub release response from the API
interface IGitHubRelease {
  // The tag name of the release (e.g., "v1.0.0")
  tag_name: string;
}

// [BY-AI] Checks if the current CLI version is outdated by comparing with the latest GitHub release
// Uses a cache file to avoid frequent API calls
// Returns null if the check fails (network issues, API errors, etc.)
export async function checkVersionOutdated() {
  try {
    const currentVersion = getVersion();
    const cache = await loadVersionCache();
    const hasCachedData = cache !== null;

    if (hasCachedData) {
      const isSameVersion = cache.currentVersion === currentVersion;

      if (isSameVersion) {
        const result = {
          isOutdated: cache.isOutdated,
          currentVersion: cache.currentVersion,
          latestVersion: cache.latestVersion,
        } satisfies IVersionCheckResult;

        return result;
      }
    }

    const githubApiUrl =
      "https://api.github.com/repos/mcpbay/mcpb/releases/latest";
    const response = await fetch(githubApiUrl);
    const isResponseOk = response.ok;

    if (!isResponseOk) {
      return null;
    }

    const release = (await response.json()) as IGitHubRelease;
    const latestVersion = release.tag_name;

    const comparison = compareVersions({
      current: currentVersion,
      latest: latestVersion,
    });
    const isUpdateAvailable = comparison > 0;

    await saveVersionCache({
      isOutdated: isUpdateAvailable,
      currentVersion,
      latestVersion,
    });

    const result = {
      isOutdated: isUpdateAvailable,
      currentVersion,
      latestVersion,
    } satisfies IVersionCheckResult;

    return result;
  } catch {
    return null;
  }
}
