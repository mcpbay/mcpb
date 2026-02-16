import { checkVersionOutdated } from "./check-version-outdated.util.ts";
import { getVersion } from "./get-version.util.ts";
import { showUpdateNotification } from "./show-update-notification.util.ts";

export async function validateVersion() {
  const currentVersion = getVersion();

  const versionCheck = await checkVersionOutdated();
  const hasVersionCheck = versionCheck !== null;

  if (hasVersionCheck) {
    const { isOutdated, currentVersion, latestVersion } = versionCheck;

    if (isOutdated && latestVersion) {
      showUpdateNotification({ currentVersion, latestVersion });
    }
  }
}
