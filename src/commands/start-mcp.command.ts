import { StdioTransport } from "@mcpbay/easy-mcp-server/transports";
import { McpServerContext } from "../classes/mcp-server-context.class.ts";
import { EasyMCPServer } from "@mcpbay/easy-mcp-server";
import { loadContextsFromConfigFile } from "../utils/load-contexts-from-config-file.util.ts";

export async function startMcpCommand(options: Record<string, any>) {
  const { config: configPath } = options;

  const contexts = await loadContextsFromConfigFile(configPath, false);
  const context = new McpServerContext(contexts);
  const transport = new StdioTransport();
  const mcpServer = new EasyMCPServer(transport, context, {});

  await mcpServer.start();
}
