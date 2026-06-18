import { StdioTransport } from "@mcpbay/easy-mcp-server/transports";
import { McpServerContext } from "../classes/mcp-server-context.class.ts";
import { EasyMCPServer } from "@mcpbay/easy-mcp-server";
import { loadContextsFromConfigFile } from "../utils/load-contexts-from-config-file.util.ts";
import { writeLog } from "../utils/write-log.util.ts";

export async function startMcpCommand(options: Record<string, any>) {
  const { config: configPath } = options;
  try {
    const contexts = await loadContextsFromConfigFile(configPath, false);

    writeLog(contexts);

    const context = new McpServerContext(contexts);
    const transport = new StdioTransport();
    const mcpServer = new EasyMCPServer(transport, context, {});

    await mcpServer.start();
  } catch (e) {
    writeLog((e as Error).message);
    writeLog((e as Error).cause as string);
    writeLog((e as Error).stack as string);
  }
}
