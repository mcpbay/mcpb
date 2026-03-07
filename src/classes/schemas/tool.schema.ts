export const TOOL_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    inputSchema: { type: "object" },
    execution: {
      type: "object",
      properties: {
        taskSupport: {
          type: "string",
          oneOf: [
            { const: "required" },
            { const: "optional" },
            { const: "forbidden" },
          ],
        },
      },
      required: ["taskSupport"],
    },
    outputSchema: { type: "object" },
    annotations: {
      type: "object",
      properties: {
        title: { type: "boolean" },
        readOnlyHint: { type: "boolean" },
        destructiveHint: { type: "boolean" },
        idempotentHint: { type: "boolean" },
        openWorldHint: { type: "boolean" },
      },
      required: [],
    },
  },
  required: ["name", "description"],
};
