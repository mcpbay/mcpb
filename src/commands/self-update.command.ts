import { getVersion } from "../utils/get-version.util.ts";
import { compareVersions } from "../utils/compare-versions.util.ts";
import { downloadFileWithProgress } from "../utils/download-file-with-progress.util.ts";
import { ArchitectureType, getOs, OSType } from "../utils/get-os.util.ts";
import { generateUpdateScriptFile } from "../utils/generate-update-script-file.util.ts";
import { getCurrentExecutableDirPath } from "../utils/get-current-executable-dir-path.util.ts";
import { fileExists } from "../utils/file-exists.util.ts";

// [BY-AI] Represents the structure of a GitHub release response from the API
interface IGitHubRelease {
  // The tag name of the release (e.g., "v1.0.0")
  tag_name: string;
  assets: {
    name: string;
    size: number;
    browser_download_url: string;
  }[];
}

// [BY-AI] Describes the installation script details for each platform
interface IInstallScriptInfo {
  // The filename of the installation script
  scriptName: string;
  // The shell command to execute the script
  shellCommand: string;
}

function getUpdateFilePath() {
  const executableDir = getCurrentExecutableDirPath();
  const updateFilePath = `${executableDir}/update` +
    (getOs()[0] === OSType.WINDOWS ? ".exe" : "");

  return updateFilePath;
}

function isUpdateExecutablePresent() {
  const updateFilePath = getUpdateFilePath();
  const isUpdateExecutablePresentInDisk = fileExists(updateFilePath);

  return isUpdateExecutablePresentInDisk;
}

async function getUpdateFileVersion() {
  const updateFilePath = getUpdateFilePath();
  const executableDir = getCurrentExecutableDirPath();
  const args = ["-v"];

  const command = new Deno.Command(updateFilePath, {
    cwd: executableDir,
    stdin: "null",
    stderr: "null",
    args: args,
  });

  const { stdout: versionBuffer, success } = await command.output();
  const version = new TextDecoder().decode(versionBuffer).trim();

  if (!success) {
    return null;
  }

  return version;
}

function executeUpdateScript() {
  const scriptPath = generateUpdateScriptFile();
  const executableDir = getCurrentExecutableDirPath();

  const command = new Deno.Command(scriptPath, {
    stdin: "null",
    stdout: "null",
    stderr: "null",
    cwd: executableDir,
  });

  command.spawn();
}

export async function selfUpdateCommand() {
  try {
    console.log("Checking for updates...");

    const currentVersion = getVersion();
    const updateFilePath = getUpdateFilePath();

    console.log(`Current version: ${currentVersion}`);

    do {
      if (isUpdateExecutablePresent()) {
        const updateFileVersion = await getUpdateFileVersion();

        if (updateFileVersion === null) {
          console.log("Update already on disk, but broken... deleted.");
          Deno.removeSync(updateFilePath);
          break;
        }

        console.log(`Update already found on disk!`);
        console.log(`New version v${updateFileVersion} installed!`);

        executeUpdateScript();
        return;
      }
    } while (false);

    const githubApiUrl =
      "https://api.github.com/repos/mcpbay/mcpb/releases/latest";
    const response = await fetch(githubApiUrl);
    const isResponseOk = response.ok;

    if (!isResponseOk) {
      await response.text();
      console.log("Failed to check for updates.");

      return;
    }

    const release = (await response.json()) as IGitHubRelease;
    const latestVersion = release.tag_name;
    console.log(`Latest version found: ${latestVersion}`);

    const comparison = compareVersions({
      current: currentVersion,
      latest: latestVersion,
    });
    const isAlreadyLatest = comparison === 0;
    const isNewerThanLatest = comparison < 0;
    const isUpdateAvailable = comparison > 0;

    if (isAlreadyLatest) {
      console.log("✓ You are already using the latest version.");

      return;
    }

    if (isNewerThanLatest) {
      console.log("✓ You are using a newer version than the latest release.");

      return;
    }

    if (isUpdateAvailable) {
      console.log(`New version available: ${latestVersion}`);

      const [os, architecture] = getOs();
      const { name, ext } = (() => {
        switch (true) {
          case os === OSType.WINDOWS:
            return { name: "mcpb-windows", ext: ".exe" };
          case os === OSType.LINUX && architecture === ArchitectureType.ARM:
            return { name: "mcpb-linux-arm", ext: "" };
          case os === OSType.LINUX && architecture === ArchitectureType.INTEL:
            return { name: "mcpb-linux-intel", ext: "" };
          case os === OSType.MACOS && architecture === ArchitectureType.ARM:
            return { name: "mcpb-mac-arm", ext: "" };
          case os === OSType.MACOS && architecture === ArchitectureType.INTEL:
            return { name: "mcpb-mac-intel", ext: "" };
        }

        throw new Error(`Unsupported OS: ${Deno.build.os}.`);
      })();

      const correctAsset = release.assets.find(({ name: _name }) =>
        _name === `${name}${ext}`
      )!;
      const executableDir = getCurrentExecutableDirPath();

      await downloadFileWithProgress({
        url: correctAsset.browser_download_url,
        path: updateFilePath,
      });

      executeUpdateScript();

      Deno.exit(0);
    }
  } catch (error) {
    console.error("Failed to update:", (error as Error).message);
    Deno.exit(1);
  }
}
