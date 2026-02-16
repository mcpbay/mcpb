import { StdioTransport } from "@mcpbay/easy-mcp-server/transports";
import { McpServerContext } from "../classes/mcp-server-context.class.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { checkConfigFileExists } from "../utils/check-config-file-exists.util.ts";
import { loadContext } from "../utils/load-context.util.ts";
import { EasyMCPServer } from "@mcpbay/easy-mcp-server";

export async function startMcpCommand(configPath?: string) {
  const config = checkConfigFileExists(configPath);
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
