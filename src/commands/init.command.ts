import { checkConfigFileExists } from "../utils/check-config-file-exists.util.ts";
import { saveConfiFile } from "../utils/save-config-file.util.ts";

export function initCommand() {
  try {
    checkConfigFileExists();
    console.log("MCPB CLI project already initialized.");
  } catch {
    saveConfiFile({ imports: {} });
    console.log("MCPB CLI project initialized!");
    console.log("");
    console.log("Check the marketplace to start using contexts:");
    console.log("https://mcpbay.io/marketplace");
    console.log("");
    console.log("You can start importing contexts using the 'mcpb add' command.");
  }
}