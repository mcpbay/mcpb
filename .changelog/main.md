
- Added scripts/diagnose-load-contexts.ts � diagnostic script for mcpb_load_contexts timeout troubleshooting. Tests JSON-format and directory-format context loading individually with timing. Added deno run diagnose task in deno.json.
- Fixed OpenCode "Invalid input: expected object" at tools[*].outputSchema.type: onClientListTools now drops any outputSchema that is not a valid MCP object schema (contexts without an output schema were emitting `{}`). Added tests/mcp-server-context.test.ts covering outputSchema sanitization.
