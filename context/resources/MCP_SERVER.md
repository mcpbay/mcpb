---
name: mcp_server
description: How the MCP server works — McpServerContext, EasyMCPServer, StdioTransport, tool/resource/prompt lifecycle. Read ARCHITECTURE first.
title: MCP Server
mimeType: text/markdown
---

# MCPB CLI — MCP Server

## Overview

The MCP server is started with `mcpb start-mcp`. It uses:
- **StdioTransport** — Communicates over stdin/stdout (standard MCP transport)
- **EasyMCPServer** — Wraps the transport and context model
- **McpServerContext** — Implements `IContextModel` with all tool/resource/prompt logic

## Built-in Tools

The MCP server injects 3 built-in tools on top of user-installed context tools:

### `mcpb_load_contexts`
- **Purpose:** Reloads contexts from the workspace-specific `mcp-config.json`
- **Required for every new task** — MCP clients don't provide workspace info natively
- **Arguments:** `workspacePath` (file:// URI)
- **Response:** `{ status: "completed", resources, tools, prompts }`
- Triggers `notify.toolsListChanged()`, `notify.promptsListChanged()`, `notify.resourcesListChanged()`

### `mcpb_list_resources`
- **Purpose:** Lists all available resources from loaded contexts
- **Needed because** some MCP clients (like OpenCode) don't understand MCP resources natively
- **Arguments:** none
- **Response:** Array of `{ id, uri, name, mimeType, size, description, title }`

### `mcpb_read_resource`
- **Purpose:** Reads a specific resource by URI
- **Arguments:** `resourceUri` (file:// URI)
- **Response:** Resource content (text or blob)

## Lifecycle

### Initialization (`onInitialize`)
1. Sets server name to `"MCPBay Server!"` and version from `deno.json`
2. Validates required environment variables for each context
3. Loads environment variable values into `this.variables`

### Tools (`onClientListTools`)
- Returns all tools from all loaded contexts
- Automatically injects `workspacePath` argument (file:// URI) into every tool's inputSchema
- Appends the 3 built-in tools

### Resources (`onClientListResources`)
- Returns all resources with `id`, `uri`, `name`, `mimeType`, `size`, `description`, `title`

### Resources Read (`onClientReadResource`)
- Finds resource by URI
- Returns `{ mimeType, blob, text, uri }`

### Prompts (`onClientListPrompts`)
- Returns prompts with `name`, `description`, `arguments`

### Prompts Get (`onClientGetPrompt`)
- Finds prompt by name
- Applies `{{PATH_PLACEHOLDER}}` and `{{arg.*}}` placeholders to messages

### Tool Call (`onClientCallTool`)
See **TOOL_STRATEGIES** resource for detailed execution flow.

## Cooldown System

Each tool has a `cooldownMs` value (default: 1000ms). When a tool is called:
1. The cooldown timestamp is recorded
2. If a subsequent call arrives before the cooldown expires, it throws "Too many requests"
3. This prevents rapid repeated execution of commands

## Caching

If a tool execution strategy has `deterministic: true`:
1. The response is cached using a key of `toolId + strategyId + JSON.stringify(args)`
2. Subsequent identical calls return the cached response
3. Cache lives in memory (`Map<number, object>`) for the lifetime of the server

## Placeholder System

Three types of placeholders are resolved in tool configs and prompts:

| Pattern | Source | Example Resolution |
|---|---|---|
| `{{TEMP}}` | OS temp dir | `/tmp` or `C:\Users\user\AppData\Local\Temp` |
| `{{CWD}}` | Current working directory | `/home/user/project` |
| `{{WORKSPACE}}` | `WORKSPACE` env var or CWD | `/home/user/project` |
| `{{PROJECT_ROOT}}` | `PROJECT_ROOT` env var or CWD | `/home/user/project` |
| `{{REPO_ROOT}}` | `REPO_ROOT` env var or CWD | `/home/user/project` |
| `{{arg.param_name}}` | Tool call argument | `"value from user"` |
| `{{env.VAR_NAME}}` | Context variable | `"value from env"` |
