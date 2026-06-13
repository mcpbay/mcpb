---
name: cli_commands
description: All CLI commands, their arguments, options, and behavior. Read CONCEPT first.
title: CLI Commands
mimeType: text/markdown
---

# MCPB CLI — CLI Commands

## Overview

The MCPB CLI is built with the `commander` npm package. The entry point is `main.ts`.

## Commands

### `mcpb init`

Initializes the MCPB CLI project in the current directory.

```
mcpb init [options]
```

**Options:**
| Flag | Type | Description |
|---|---|---|
| `--with-claude` | `boolean` | Also injects the MCPB prompt into `CLAUDE.md` |

**Behavior:**
1. Creates/updates `AGENTS.md` with the "CRITICAL MCPB MCP GUIDELINES" section
2. If `--with-claude`: creates/updates `CLAUDE.md` with the required prompt
3. If `CLAUDE.md` exists but `--with-claude` was not provided: warns the user
4. Creates `mcp-config.json` with `{ "imports": {} }` if it does not exist
5. Prints marketplace URL: `https://mcpbay.io/marketplace`

### `mcpb add <source>`

Installs a new context from a slug, GitHub URL, or local disk path.

```
mcpb add <source> [options]
```

**Arguments:**
| Arg | Description |
|---|---|
| `source` | Context slug (e.g., `typescript-utilities`), slug with version (e.g., `typescript-utilities@1.0.4`), GitHub URL, or disk path |

**Options:**
| Flag | Type | Default | Description |
|---|---|---|---|
| `-c, --config <path>` | `string` | `./mcp-config.json` | Path to the config file |
| `-f, --force` | `boolean` | `false` | Forces reinstallation |

**Source Detection Logic:**
1. If the source matches a GitHub URL pattern → `downloadAndInstallContextByGitHub()`
2. If the source is a directory containing `context.json` → `installContextFromDisk()`
3. Otherwise → `downloadAndInstallContextBySlug()` via MCPBay API

**Post-install:**
- If the context has TypeScript tools and Deno is not installed, prints installation instructions

### `mcpb start-mcp`

Starts the MCP server over stdio transport.

```
mcpb start-mcp [options]
```

**Options:**
| Flag | Type | Default | Description |
|---|---|---|---|
| `-c, --config <path>` | `string` | `./mcp-config.json` | Path to the config file |

**Behavior:**
1. Loads all contexts from `mcp-config.json` via `loadContextsFromConfigFile()`
2. Creates `McpServerContext` with the loaded contexts
3. Creates `StdioTransport` and `EasyMCPServer`
4. Calls `server.start()` — begins listening for MCP messages on stdin/stdout

### `mcpb install-mcp <target>`

Installs the MCPB MCP server into an AI tool's configuration.

```
mcpb install-mcp <target> [options]
```

**Arguments:**
| Arg | Values | Description |
|---|---|---|
| `target` | `claudecode`, `opencode`, `cursor` | The AI tool to install into |

**Options:**
| Flag | Type | Default | Description |
|---|---|---|---|
| `--mcp-name <name>` | `string` | `mcpb` | Name for the MCP server (must be kebab-case) |
| `--scope <scope>` | `global`, `project` | `project` | Installation scope |

**Installation Paths:**

| Target | Global Config | Project Config |
|---|---|---|
| Claude Code | `~/.claude.json` | `.mcp.json` |
| OpenCode | `~/.config/opencode/opencode.json` | `opencode.jsonc` |
| Cursor | `~/.cursor/mcp.json` | `.cursor/mcp.json` |

**Config Structure for Each Target:**

ClaudeCode & Cursor:
```json
{
  "mcpServers": {
    "mcpb": {
      "command": "mcpb",
      "args": ["start-mcp"]
    }
  }
}
```

OpenCode:
```json
{
  "mcp": {
    "mcpbay": {
      "enabled": true,
      "type": "local",
      "command": ["mcpb", "start-mcp"],
      "environment": {}
    }
  }
}
```

### `mcpb contexts-info`

Displays information about all installed contexts.

```
mcpb contexts-info [options]
```

**Options:**
| Flag | Type | Default | Description |
|---|---|---|---|
| `-c, --config <path>` | `string` | `./mcp-config.json` | Path to the config file |

**Output includes:** tools, prompts, resources, names, versions, and permissions per context.

### `mcpb self-update`

Updates the MCPB CLI tool to the latest version.

```
mcpb self-update
```

See the **SELF_UPDATE** resource for detailed behavior.

### `mcpb --version` / `mcpb -v`

Prints the current version (from `deno.json`).

### `mcpb --help`

Prints help information with all available commands.
