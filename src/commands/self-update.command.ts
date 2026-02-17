import { getVersion } from "../utils/get-version.util.ts";
import { compareVersions } from "../utils/compare-versions.util.ts";
import { ArchitectureType, getOs, OSType } from "../utils/get-os.util.ts";
import { generateUpdateScriptFile } from "../utils/generate-update-script-file.util.ts";
import { getCurrentExecutableDirPath } from "../utils/get-current-executable-dir-path.util.ts";
import { fileExists } from "../utils/file-exists.util.ts";
import { sleep } from "../utils/sleep.util.ts";
import { downloadFileWithProgress } from "../utils/download-file-with-progress.util.ts";
import * as path from "jsr:@std/path";

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

function getExecutableFileName() {
  const [os] = getOs();

  return os === OSType.WINDOWS ? "mcpb.exe" : "mcpb";
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

async function getExecutableResponse(filePath: string, args?: string[]) {
  const command = new Deno.Command(filePath, {
    args,
    stdin: "null",
    stdout: "piped",
    stderr: "null",
  });

  const output = await command.output();
  const strOutput = new TextDecoder().decode(output.stdout);

  return strOutput;
}

async function getGithubLatestRelease() {
  // Yeah! It is hardcoded... what you gonna do?!
  const githubApiUrl = "https://api.github.com/repos/mcpbay/mcpb/releases/latest";
  const response = await fetch(githubApiUrl);

  if (!response.ok) {
    await response.text();
    console.log("Failed to check for updates. Please try again few minutes.");

    return;
  }

  const release = (await response.json()) as IGitHubRelease;

  return release;
}

function getGithubLatestReleaseBinaryFilenameByOS() {
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

  return { name, ext, fullName: `${name}${ext}` };
}

/**
 * If present on the `INTENTION_FLAG_UID` environment variable, it means that the
 * executable must replace itself.
 */
const INTERNAL_SELF_REPLACE_INTENTION = "f26b5225c51e4442ce2d1ed918b4add5974314264ad246757935c4414b7f23b6";
const INTERNAL_DELETE_UPDATE_INTENTION = "4614572bf3a97ad5d693bb9ee5ab710caf38dd5aa4e0b67f60c0d5ead7a36670";

function writeLog(text: string) {
  return;
  const currentDir = getCurrentExecutableDirPath();
  const currentExecutableName = path.basename(Deno.execPath()).replace(".exe", "");
  const logFilePath = `${currentDir}/${currentExecutableName}.log`;

  Deno.writeTextFileSync(logFilePath, text + "\n", { append: true, create: true });
}

/**
 * This command is a little bit annoying... but i'll explain it.
 * The action this command performs depends on the `INTENTION_FLAG_UID` environment variable.
 * 
 * `INTENTION_FLAG_UID` is undefined:
 *   Step 1: Compare current executable version with remote version.
 *   Step 2: Checks if there is an `update` executable file in the same directory.
 *           If present, checks if the current update is the latest version.
 *             If the current update is the latest version: Step 3.
 *           If not present, download the update in the same directory and call it `update`.
 *   Step 3: Execute the `update` executable file using `self-update` with env `INTENTION_FLAG_UID` = `INTERNAL_SELF_UPDATE_REPLACE_INTENTION`.
 *           Removes the current `mcpb` executable and replace it with the update (itself).
 *           Execute the new `mcpb` executable with env `INTENTION_FLAG_UID` = `INTERNAL_DELETE_UPDATE_INTENTION`.
 *           Remove the update file.
 * `INTENTION_FLAG_UID` is `INTERNAL_SELF_UPDATE_REPLACE_INTENTION`:
 *    Step 1: Delete the current `mcpb` executable file.
 *    Step 2: Copy itself as `mcpb`.
 *    Step 3: Execute the new `mcpb` executable with env `INTENTION_FLAG_UID` = `INTERNAL_DELETE_UPDATE_INTENTION`.
 * `INTENTION_FLAG_UID` is `INTERNAL_DELETE_UPDATE_INTENTION`:
 *    Step 1: Delete the `update` executable file.
 * @returns 
 */
export async function selfUpdateCommand() {
  const INTENTION_FLAG_UID = Deno.env.get("INTENTION_FLAG_UID");
  const currentExecutableDir = getCurrentExecutableDirPath();
  const updateFilePath = getUpdateFilePath();
  const executableName = getExecutableFileName();

  writeLog(`INTENTION_FLAG_UID: ${INTENTION_FLAG_UID}`);

  const selfExecuteWithIntention = (intentionCode: string, useUpdate = true) => {
    writeLog(`Execute update with intention: ${intentionCode}`);

    const execution = new Deno.Command(
      useUpdate
        ? updateFilePath
        : executableName,
      {
        args: ["self-update"],
        stdin: "null",
        stdout: "null",
        stderr: "null",
        cwd: currentExecutableDir,
        env: { INTENTION_FLAG_UID: intentionCode },
        detached: true,
      }
    );

    console.log("Update executed!");
    execution.spawn().unref();
    Deno.exit(0);
  };

  switch (true) {
    case INTENTION_FLAG_UID === INTERNAL_SELF_REPLACE_INTENTION: {
      writeLog(`Wait 100ms`);
      await sleep(500);

      const executablePath = `${currentExecutableDir}/${executableName}`;

      writeLog(`Executable path: ${executablePath}`);

      Deno.removeSync(executablePath);
      writeLog(`Deleted: ${executablePath}`);
      Deno.copyFileSync(updateFilePath, executablePath);
      writeLog(`Copy: ${updateFilePath} -> ${executablePath}`);
      selfExecuteWithIntention(INTERNAL_DELETE_UPDATE_INTENTION, false);
      return;
    }
    case INTENTION_FLAG_UID === INTERNAL_DELETE_UPDATE_INTENTION: {
      writeLog(`Wait 100ms`);
      await sleep(1000);
      writeLog(`Delete update file...`);
      Deno.removeSync(updateFilePath);
      return;
    }
  }

  writeLog(`Download update`);

  const mcpbRelease = await getGithubLatestRelease();

  if (!mcpbRelease) {
    return;
  }

  const latestReleaseVersion = mcpbRelease.tag_name.replace("v", "");
  const currentVersion = getVersion();

  writeLog(`Latest release version: ${latestReleaseVersion}`);
  writeLog(`Current version: ${currentVersion}`);

  if (latestReleaseVersion === currentVersion) {
    console.log("MCPB is already up to date.");
    writeLog("MCPB is already up to date.");

    return;
  }

  do {
    if (fileExists(updateFilePath)) {
      writeLog("Update file exists, check version...");
      const updateFileVersion = await getExecutableResponse(updateFilePath, ["--version"]);

      if (updateFileVersion === null) {
        writeLog("Update file is broken, delete it.");
        // Broken, delete it.
        Deno.removeSync(updateFilePath);
        break;
      }

      const versionComparison = compareVersions({
        current: latestReleaseVersion,
        latest: updateFileVersion
      });

      if (versionComparison === 0) {
        writeLog("Update file is up to date.");
        return selfExecuteWithIntention(INTERNAL_SELF_REPLACE_INTENTION);
      }

      writeLog("Update file is outdated, delete it.");
      // Outdated, delete it.
      Deno.removeSync(updateFilePath);
    }
  } while (false);

  const { name: binaryReleaseName } = getGithubLatestReleaseBinaryFilenameByOS();
  const asset = mcpbRelease.assets.find((asset) => asset.name === binaryReleaseName);

  writeLog(`Binary release name: ${binaryReleaseName}`);
  writeLog(`Asset: ${JSON.stringify(asset)}`);

  if (!asset) {
    console.log("MCPB release binary not found for this OS:", binaryReleaseName);

    Deno.exit(1);
  }

  writeLog(`Downloading update...`);
  await downloadFileWithProgress({
    url: asset.browser_download_url,
    path: updateFilePath
  });

  writeLog(`Executing update...`);
  selfExecuteWithIntention(INTERNAL_SELF_REPLACE_INTENTION);
}