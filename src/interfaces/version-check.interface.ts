// [BY-AI] Represents the result of a version check operation
export interface IVersionCheckResult {
  // Whether the current version is outdated
  isOutdated: boolean;
  // The current version of the CLI
  currentVersion: string;
  // The latest available version (only present if outdated)
  latestVersion?: string;
}

// [BY-AI] Represents the cached version check data stored in the file system
export interface IVersionCache {
  // Whether the version was determined to be outdated
  isOutdated: boolean;
  // The current version that was checked
  currentVersion: string;
  // The latest version available at the time of check
  latestVersion: string;
  // Timestamp of when the check was performed (ISO format)
  checkedAt: string;
}
