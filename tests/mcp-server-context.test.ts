import { assertEquals } from "@std/assert";
import {
  type ComputableTool,
  type ILoadableServerContext,
  McpServerContext,
} from "../src/classes/mcp-server-context.class.ts";

function createTool(outputSchema: unknown): ComputableTool {
  return {
    id: "test:tool:1",
    name: "test_tool",
    description: "A tool used for testing.",
    inputSchema: { type: "object", properties: {} },
    outputSchema,
    execute: async () => ({ content: [] }),
  } as unknown as ComputableTool;
}

function createServerContext(tools: ComputableTool[]): McpServerContext {
  const context: ILoadableServerContext = {
    id: 1,
    name: "test",
    slug: "test",
    version: "1.0.0",
    prompts: [],
    resources: [],
    tools,
  };

  return new McpServerContext([context]);
}

const options = void 0 as never;

Deno.test("onClientListTools drops an empty outputSchema (`{}`)", async () => {
  const serverContext = createServerContext([createTool({})]);
  const tools = await serverContext.onClientListTools(options);
  const tool = tools.find((t) => t.name === "test_tool")!;

  assertEquals("outputSchema" in tool, false);
});

Deno.test("onClientListTools drops a missing outputSchema", async () => {
  const serverContext = createServerContext([createTool(undefined)]);
  const tools = await serverContext.onClientListTools(options);
  const tool = tools.find((t) => t.name === "test_tool")!;

  assertEquals("outputSchema" in tool, false);
});

Deno.test("onClientListTools drops a non-object outputSchema", async () => {
  const serverContext = createServerContext([
    createTool({ type: "array", items: { type: "string" } }),
  ]);
  const tools = await serverContext.onClientListTools(options);
  const tool = tools.find((t) => t.name === "test_tool")!;

  assertEquals("outputSchema" in tool, false);
});

Deno.test("onClientListTools keeps a valid object outputSchema", async () => {
  const outputSchema = {
    type: "object",
    properties: { status: { type: "string" } },
    required: ["status"],
  };
  const serverContext = createServerContext([createTool(outputSchema)]);
  const tools = await serverContext.onClientListTools(options);
  const tool = tools.find((t) => t.name === "test_tool")!;

  assertEquals(tool.outputSchema, outputSchema);
});

Deno.test("onClientListTools always returns the built-in MCPBay tools", async () => {
  const serverContext = createServerContext([]);
  const tools = await serverContext.onClientListTools(options);

  assertEquals(
    tools.map((tool) => tool.name),
    ["mcpb_load_contexts", "mcpb_read_resource", "mcpb_list_resources"],
  );
});
