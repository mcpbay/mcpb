---
name: installation
description: Installing MCPB CLI, building from source, and installing the MCP server into AI tools. Read CONCEPT first.
title: Installation
mimeType: text/markdown
---

# MCPB CLI — Installation

## Installing the CLI Binary

MCPB CLI is distributed as a pre-compiled binary for each platform. Download the latest release from GitHub:

```
https://github.com/mcpbay/mcpb/releases/latest
```

Platform binaries:
- Windows: `mcpb-windows.exe`
- Linux (aarch64): `mcpb-linux-arm`
- Linux (x86_64): `mcpb-linux-intel`
- macOS (aarch64): `mcpb-mac-arm`
- macOS (x86_64): `mcpb-mac-intel`

After downloading, rename to `mcpb` (or `mcpb.exe` on Windows) and place it in your PATH.

## Building from Source

MCPB CLI is a Deno project. To build from source:

```bash
# Install Deno: https://deno.com/
# Clone the repository
git clone https://github.com/mcpbay/mcpb.git
cd mcpb

# For Windows
deno task build:windows

# For Linux ARM
deno task build:linux-arm

# For Linux Intel
deno task build:linux-intel

# For macOS ARM
deno task build:mac-arm

# For macOS Intel
deno task build:mac-intel
```

Build output goes to `./dist/`.

### Running in Development

```bash
deno run -A --env-file=.env.mcpbay main.ts
```

### Running Tests

```bash
deno task test
# Equivalent to: deno test -A ./tests
```

## Installing MCP Server into AI Tools

After installing the `mcpb` binary, use `mcpb install-mcp` to install the MCP server:

```bash
# Install to Claude Code (project scope)
mcpb install-mcp claudecode

# Install to OpenCode (project scope)
mcpb install-mcp opencode

# Install to Cursor (project scope)
mcpb install-mcp cursor

# Install globally (for all projects)
mcpb install-mcp claudecode --scope global

# Custom MCP server name
mcpb install-mcp opencode --mcp-name my-mcpb
```

### Configuration Locations

| Tool | Global Config | Project Config |
|---|---|---|
| Claude Code | `~/.claude.json` | `.mcp.json` |
| OpenCode | `~/.config/opencode/opencode.json` | `opencode.jsonc` |
| Cursor | `~/.cursor/mcp.json` | `.cursor/mcp.json` |

## Initializing a Project

After installing the CLI, initialize a project:

```bash
cd my-project
mcpb init
# With Claude Code support:
mcpb init --with-claude
```

This creates/updates:
- `AGENTS.md` with MCPB guidelines section
- `mcp-config.json` with empty imports

## Adding Contexts

```bash
# From MCPBay marketplace (by slug)
mcpb add typescript-utilities

# With specific version
mcpb add typescript-utilities@1.0.4

# From GitHub
mcpb add github://mcpbay/my-context

# From local disk
mcpb add /path/to/my-context

# Force reinstall
mcpb add typescript-utilities --force
```

## Prerequisites

- **Deno runtime** — Required only if installed contexts have TypeScript tools. Install from `https://deno.com/`
- **Git** — Required for GitHub-sourced contexts
- **Docker** — Required for sandbox execution features (if used by contexts)
