import { expandTilde } from "../utils/expand-tilde.util.ts";
import { writeJsonToFile } from "../utils/write-json-to-file.util.ts";
import { isKebabCase } from "../validators/is-kebab-case.validator.ts";
import { deepPatchObject } from "../utils/deep-patch-object.util.ts";
import { readOrCreateJsonFile } from "../utils/read-or-create-json-file.util.ts";

export enum InstallMCPTarget {
  CLAUDE_CODE = "claudecode",
  OPEN_CODE = "opencode",
  CURSOR = "cursor",
}

export enum McpScope {
  GLOBAL = "global",
  PROJECT = "project",
  USER = "user",
}

interface IInstallMcpbMcpToTargetArguments {
  aiToolName: string;
  mcpName: string;
  globalFileConfigurationPath: string;
  projectFileConfigurationPath: string;
  mcpbMcpConfig: Record<string, unknown>;
  memberWhereCheckMcpExistence: string;
  global?: boolean;
}

function installMcpbMcpToTarget(args: IInstallMcpbMcpToTargetArguments) {
  const { mcpName, global, aiToolName, globalFileConfigurationPath, mcpbMcpConfig, memberWhereCheckMcpExistence, projectFileConfigurationPath } = args;
  const claudeCodeJsonPath = global ? expandTilde(globalFileConfigurationPath)! : projectFileConfigurationPath;

  const { created: isCreatedJson, json: claudeJson } =
    readOrCreateJsonFile(claudeCodeJsonPath, mcpbMcpConfig);

  console.log(`Installing to ${aiToolName}...`);

  if (!isCreatedJson) {
    const mcps = claudeJson[memberWhereCheckMcpExistence] as object;

    if (mcpName in mcps) {
      console.log(`MCPB MCP is already installed in ${aiToolName} as \`${mcpName}\`.`);
      return;
    }
  }

  const updatedClaudeCodeJson =
    deepPatchObject(claudeJson as unknown as Record<string, unknown>, mcpbMcpConfig);

  writeJsonToFile(claudeCodeJsonPath, updatedClaudeCodeJson);

  console.log(`MCPB MCP installed in ${aiToolName} as \`${mcpName}\`.`);
}

function installMcpToClaudeCode(mcpName: string, global?: boolean) {
  const mcpbMcpConfig = {
    mcpServers: {
      [mcpName]: {
        command: "mcpb",
        args: ["start-mcp"]
      }
    }
  };

  return installMcpbMcpToTarget({
    aiToolName: "ClaudeCode",
    mcpName,
    global,
    globalFileConfigurationPath: "~/.claude.json",
    projectFileConfigurationPath: ".mcp.json",
    mcpbMcpConfig,
    memberWhereCheckMcpExistence: "mcpServers",
  });
}

function installMcpToOpenCode(mcpName: string, global?: boolean) {
  const mcpbMcpConfig = {
    "$schema": "https://opencode.ai/config.json",
    mcp: {
      mcpbay: {
        enabled: true,
        type: "local",
        command: [
          "mcpb",
          "start-mcp",
        ],
        environment: {}
      }
    },
  };

  return installMcpbMcpToTarget({
    aiToolName: "OpenCode",
    mcpName,
    global,
    globalFileConfigurationPath: "~/.config/opencode/opencode.json",
    projectFileConfigurationPath: "opencode.jsonc",
    mcpbMcpConfig,
    memberWhereCheckMcpExistence: "mcp",
  });
}

function installMcpToCursor(mcpName: string, global?: boolean) {
  const mcpbMcpConfig = {
    mcpServers: {
      [mcpName]: {
        command: "mcpb",
        args: ["start-mcp"],
      }
    }
  };

  return installMcpbMcpToTarget({
    aiToolName: "Cursor",
    mcpName,
    global,
    globalFileConfigurationPath: "~/.cursor/mcp.json",
    projectFileConfigurationPath: ".cursor/mcp.json",
    mcpbMcpConfig,
    memberWhereCheckMcpExistence: "mcpServers",
  });
}

export function installMcpCommand(
  target: InstallMCPTarget,
  options: Record<string, string>,
) {
  const { mcpName = "mcpb", scope = McpScope.PROJECT } = options;
  const isGlobalScope = scope === McpScope.GLOBAL;
  const intallers = {
    [InstallMCPTarget.CLAUDE_CODE]: installMcpToClaudeCode,
    [InstallMCPTarget.OPEN_CODE]: installMcpToOpenCode,
    [InstallMCPTarget.CURSOR]: installMcpToCursor,
  };

  if (!isKebabCase(mcpName)) {
    console.log("MCP name must be kebab-case formatted.");
    return;
  }

  if (intallers[target]) {
    intallers[target](mcpName, isGlobalScope);
  } else {
    console.log(`Invalid target \`${target}\`.`);
  }
}
