# MCPB CLI — Context for LLMs

This context describes the **MCPB CLI** (`mcpb`) — a Deno-based CLI tool and MCP server that is the core of the MCPBay ecosystem. It allows users to install, manage, and serve MCP (Model Context Protocol) contexts.

## Required Workflow

Before starting any task, you must:
1. Check available resources by reading their descriptions to understand what is needed.
2. Use the `mcpb_load_contexts` tool to load the contexts for the current workspace.

## Resources
- **CONCEPT** — High-level overview: what MCPB CLI is, its purpose, and the MCPBay ecosystem.
- **ARCHITECTURE** — Project structure, module organization, and data flow.
- **CLI_COMMANDS** — All CLI commands: `init`, `add`, `start-mcp`, `install-mcp`, `self-update`, `contexts-info`, `version`.
- **MCP_SERVER** — How the MCP server works: `McpServerContext`, EasyMCPServer, StdioTransport, tool/resource/prompt lifecycle.
- **CONTEXT_SYSTEM** — How contexts are loaded from config file, disk, GitHub, and the MCPBay marketplace.
- **TOOL_STRATEGIES** — Tool execution strategies: `local` (shell commands) and `local-script` (TypeScript via Deno subprocess).
- **SELF_UPDATE** — Multi-phase binary replacement update mechanism with rollback safety.
- **INSTALLATION** — Installing MCPB into AI tools: Claude Code, OpenCode, and Cursor.

## Tools
- **get_project_info** — Returns the current project version and basic information.
- **list_installed_contexts** — Lists all installed contexts from the config file.

## Prompts
- **explain_code** — Explains a code section from the MCPB source.
- **suggest_feature** — Suggests how to implement a new feature or fix.
