import semver from "semver";

interface ICompareVersionsArguments {
  // The current version to compare
  current: string;
  // The latest version to compare against
  latest: string;
}

// [BY-AI] Compares two semantic version strings and returns:
// - 1 if latest is newer than current (update available)
// - 0 if versions are equal
// - -1 if current is newer than latest
export function compareVersions(args: ICompareVersionsArguments) {
  const { current, latest } = args;
  const vPatternDetector = /^v/;
  const cleanCurrent = current.replace(vPatternDetector, "");
  const cleanLatest = latest.replace(vPatternDetector, "");

  if (semver.gt(cleanLatest, cleanCurrent)) {
    return 1;
  } else if (semver.gt(cleanCurrent, cleanLatest)) {
    return -1;
  }

  return 0;
}
