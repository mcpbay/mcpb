import { getDirname } from "./get-dirname.util.ts";
import { getInstallationPath } from "./get-installation-path.util.ts";

export function getInstallationDir() {
  return getDirname(getInstallationPath());
}
