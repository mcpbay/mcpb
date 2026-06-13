import { z } from "zod";

export function toolMeta() {
  return {
    name: "get_project_info",
    description: "Returns the current MCPB CLI project version and basic information from deno.json.",
    title: "Get Project Info",
    inputSchema: z.object({
      workspacePath: z.string().describe("file:// URI pointing to a workspace directory."),
    }).toJSONSchema(),
  };
}

export function toolHandler(args: Record<string, unknown>) {
  const version = "1.2.17";
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const cwd = process.cwd();

  return {
    version,
    nodeVersion,
    platform,
    arch,
    cwd,
    description: "MCPB CLI — A Deno-based CLI tool and MCP server for the MCPBay ecosystem.",
    mainEntry: "main.ts",
    configFile: "mcp-config.json",
    contextsDirectory: "context_modules/",
    availableCommands: [
      "init", "add", "start-mcp", "install-mcp", "self-update",
      "contexts-info", "--version", "--help",
    ],
  };
}
