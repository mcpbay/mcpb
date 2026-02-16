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
  const cleanCurrent = current.replace(/^v/, "");
  const cleanLatest = latest.replace(/^v/, "");

  const currentParts = cleanCurrent.split(".").map(Number);
  const latestParts = cleanLatest.split(".").map(Number);
  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let i = 0; i < maxLength; i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    const isLatestNewer = latestPart > currentPart;
    const isLatestOlder = latestPart < currentPart;

    if (isLatestNewer) {
      return 1;
    }

    if (isLatestOlder) {
      return -1;
    }
  }

  return 0;
}
