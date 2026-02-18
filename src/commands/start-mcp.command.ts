import { StdioTransport } from "@mcpbay/easy-mcp-server/transports";
import { McpServerContext } from "../classes/mcp-server-context.class.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { loadContext } from "../utils/load-context.util.ts";
import { EasyMCPServer } from "@mcpbay/easy-mcp-server";
import { loadOrCreateConfigFile } from "../utils/load-or-create-config-file.util.ts";

export async function startMcpCommand(options: Record<string, any>) {
  const { config: configPath } = options;
  const config = loadOrCreateConfigFile(configPath);
  const contexts: ContextVersion[] = [];

  for (const [slug, version] of Object.entries(config.imports)) {
    const context = await loadContext(slug, version);

    contexts.push(context);
  }

  const context = new McpServerContext(contexts);
  const transport = new StdioTransport();
  const mcpServer = new EasyMCPServer(transport, context, {});

  await mcpServer.start();
}
