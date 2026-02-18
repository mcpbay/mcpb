import { expandTilde } from "../utils/expand-tilde.util.ts";
import { fileExists } from "../utils/file-exists.util.ts";
import { readJsonFromFile } from "../utils/read-json-from-file.util.ts";
import { writeJsonToFile } from "../utils/write-json-to-file.util.ts";
import { isKebabCase } from "../validators/is-kebab-case.validator.ts";
import { isSnakeCase } from "../validators/is-snake-case.validator.ts";

interface IClaudeJSONSchema {
  mcpServers: Record<string, unknown>;
}

export enum InstallMCPTarget {
  CLAUDE_CODE = "claudecode",
  // OPEN_CODE = "opencode",
}

const CLAUDE_CODE_JSON_PATH = expandTilde("~/.claude.json");

export function installMcpCommand(target: InstallMCPTarget, options: Record<string, string>) {
  const mcpName = options?.mcpName || "mcpb";

  if (!CLAUDE_CODE_JSON_PATH) {
    console.log("ClaudeCode is not installed. Please install it first.");

    return;
  }

  if (!isKebabCase(mcpName)) {
    console.log("MCP name must be kebab-case formatted.");

    return;
  }

  if (target === InstallMCPTarget.CLAUDE_CODE) {
    if (!fileExists(CLAUDE_CODE_JSON_PATH)) {
      console.log("ClaudeCode is not installed. Please install it first.");

      return;
    }

    const claudeJson = readJsonFromFile<IClaudeJSONSchema>(CLAUDE_CODE_JSON_PATH);
    const { mcpServers = {} } = claudeJson;

    console.log("Installing to ClaudeCode...");

    if (mcpName in mcpServers) {
      console.log(`MCPB \`${mcpName}\` is already installed in ClaudeCode.`);

      return;
    }

    writeJsonToFile(CLAUDE_CODE_JSON_PATH, {
      ...claudeJson,
      mcpServers: {
        ...claudeJson.mcpServers,
        [mcpName]: {
          command: "mcpb",
          args: ["start-mcp"]
        },
      },
    });

    console.log(`MCPB \`${mcpName}\` is installed in ClaudeCode.`);
  } else {
    console.log(`Invalid target \`${target}\`.`);
  }
}