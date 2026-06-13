---
name: architecture
description: Project structure, module organization, data flow, and design patterns. Read CONCEPT first.
title: Architecture
mimeType: text/markdown
---

# MCPB CLI — Architecture

## Directory Structure

```
mcpbay-mcpb/
  main.ts                        # CLI entry point (commander)
  deno.json                      # Project config, version, build tasks
  mcp-config.json                # User config (list of installed contexts)
  AGENTS.md                      # LLM guidelines for this project
  context/                       # This context project (for LLMs)
  context_modules/               # Installed contexts (from marketplace, GitHub, disk)
    <slug>/<version>.json        # JSON-based context format
    <slug>/<version>/            # Directory-based context format
      context.json
      deno.json
      tools/
      resources/
      prompts/
  src/
    commands/                    # CLI command handlers
    classes/                     # Core classes
    handlers/                    # Tool execution strategy handlers
    schemas/                     # JSON Schema definitions
    types/                       # Auto-generated OpenAPI types
    constants/                   # Configuration constants
    enums/                       # Enumerations
    interfaces/                  # TypeScript interfaces
    utils/                       # 35+ utility functions
    validators/                  # Validation utilities
    api/schema.d.ts              # Auto-generated OpenAPI types
  tests/                         # Test files and fixtures
  local_scripts/                 # Platform-specific build/install scripts
```

## Entry Point (`main.ts`)

The CLI is built with `commander` (npm package). It registers 6 commands:

```typescript
const program = new Command();
program.command("init")         // Initialize MCPB project
program.command("self-update")  // Update the CLI binary
program.command("install-mcp")  // Install MCP server to AI tools
program.command("add")          // Install a context
program.command("contexts-info")// List all installed contexts
program.command("start-mcp")    // Start the MCP server
program.parse();
```

Key initialization at startup:
1. `clearUpdateScriptFile()` — Clean up any leftover update scripts
2. `validateVersion()` — Check if a newer CLI version is available

## Data Flow

### Context Installation Flow

```
User runs: mcpb add <source>
  |
  +-- Is it a GitHub URL? → downloadAndInstallContextByGitHub()
  |     Uses @mcpbay/contexts-manager to download via GitHub API
  |     Copies files to context_modules/<slug>/<version>/
  |     Updates mcp-config.json with { ref: "github://...", type: "remote" }
  |
  +-- Is it a local disk path? → installContextFromDisk()
  |     Uses @mcpbay/contexts-manager to load context
  |     Copies files to context_modules/<slug>/<version>/
  |     Updates mcp-config.json with { ref: "<path>", type: "local" }
  |
  +-- Default (slug) → downloadAndInstallContextBySlug()
        Downloads from MCPBay API: https://papi.mcpbay.io/v1/mcp/download/<slug>
        Saves as context_modules/<slug>/<version>.json
        Updates mcp-config.json with version string
        Injects prompt into AGENTS.md via MdManager
        Checks if tools need Deno runtime
```

### MCP Server Flow

```
User runs: mcpb start-mcp
  |
  +-- loadContextsFromConfigFile() reads mcp-config.json
  |     For each import in config.imports:
  |       loadContext() reads from context_modules/ (JSON or dir)
  |       Maps tools, resources, prompts into ContextVersion[]
  |
  +-- new McpServerContext(contexts)
  |     Flattens all tools, resources, prompts from all contexts
  |     Sets up placeholders: {{TEMP}}, {{CWD}}, {{WORKSPACE}}, etc.
  |
  +-- new EasyMCPServer(transport, context, options)
  |     transport = new StdioTransport()
  |
  +-- server.start()
        Listens for MCP messages over stdin/stdout
```

### Tool Execution Flow

```
MCP Client calls tool "some_tool" with args
  |
  +-- McpServerContext.onClientCallTool()
  |
  +-- Special built-in tools:
  |     mcpb_load_contexts → Reloads contexts from workspace's mcp-config.json
  |     mcpb_list_resources → Lists all available resources
  |     mcpb_read_resource  → Reads a specific resource by URI
  |
  +-- For each execution strategy:
  |     "local" → handleLocalStrategy()
  |       Checks OS compatibility, required apps
  |       Replaces {{arg.*}}, {{path.*}}, {{env.*}} placeholders
  |       Executes shell command via Deno.Command
  |       Validates success criteria (exit code, response patterns, JSON, file)
  |
  |     "local-script" → handleLocalScriptStrategy()
  |       Validates workspacePath argument
  |       Calls tsExecute() with the tool's TypeScript code
  |       Removes static imports, injects sandboxed import function
  |       Spawns deno run with calculated permissions
  |       Returns JSON-parsed result
  |
  +-- Returns ToolCallResponse to MCP client
```

## Core Classes

### McpServerContext (`src/classes/mcp-server-context.class.ts`)
- Implements `IContextModel` from `@mcpbay/easy-mcp-server`
- Manages the full lifecycle: tools, resources, prompts, cooldowns, cache, variables
- Handles 3 built-in tools: `mcpb_load_contexts`, `mcpb_list_resources`, `mcpb_read_resource`
- Provides `executeShellCommand()` for running OS commands
- Placeholder system: `{{TEMP}}`, `{{CWD}}`, `{{WORKSPACE}}`, `{{PROJECT_ROOT}}`, `{{REPO_ROOT}}`
- Cooldown system: prevents rapid repeated calls to the same tool

### MdManager (`src/classes/md-manager.class.ts`)
- Manages sections in Markdown files (read, create, update, replace, delete)
- Used for injecting context prompts into AGENTS.md and CLAUDE.md
- Uses heading-level-aware section detection

### MetadataManager (`src/classes/metadatada-manager.class.ts`)
- Uses Deno KV for file metadata storage
- Assigns UUIDs to files for cross-session metadata tracking
- Not currently used in the MCP server flow

### UniversalAppChecker (`src/classes/universal-app-checker.class.ts`)
- Cross-platform application detection (Windows where, macOS which, Linux which/whereis/command)
- Version detection with multiple flag attempts (--version, -v, -V)
- Used by tool strategies to verify required dependencies

### JsonSchemaMapper (`src/classes/json-schema-mapper.class.ts`)
- Maps command output to structured content using JSON Schema
- Supports argument extraction with `{{arg.param_name}}` syntax
- Used by local strategy for `outputMapping`

## Key Patterns

### Strategy Pattern
Tools can have multiple execution strategies. Each strategy is tried in order; if a strategy returns `true` (not applicable), the next one is tried. This allows fallback between platforms.

### Placeholder System
Three types of placeholders:
- `{{PATH_PLACEHOLDER}}` → Resolved from `placeholders` Map (TEMP, CWD, WORKSPACE, PROJECT_ROOT, REPO_ROOT)
- `{{arg.param_name}}` → Resolved from tool call arguments
- `{{env.VAR_NAME}}` → Resolved from context variables

### Config File (mcp-config.json)
```json
{
  "imports": {
    "context-slug": "1.0.0",
    "github-context": { "version": "1.0.0", "ref": "github://owner/repo", "type": "remote" },
    "disk-context": { "version": "1.0.0", "ref": "/path/to/context", "type": "local" }
  }
}
```

### Version Check Cache
```json
{
  "isOutdated": false,
  "currentVersion": "1.2.17",
  "latestVersion": "1.2.17",
  "checkedAt": "2025-01-01T00:00:00.000Z"
}
```
