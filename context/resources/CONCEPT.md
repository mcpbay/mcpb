---
name: concept
description: High-level overview of MCPB CLI — what it is, its purpose, and the MCPBay ecosystem. Required to understand the project.
title: Concept
mimeType: text/markdown
---

# MCPB CLI — Concept

## What is MCPB CLI?

**MCPB CLI** (`mcpb`) is a Deno-based Command Line Interface tool and MCP (Model Context Protocol) server. It is the core tool of the **MCPBay ecosystem**, a marketplace and runtime for MCP contexts.

A **context** is a directory on disk that describes a software package, library, or domain to Large Language Models (LLMs) through:
- **Resources** — Structured documentation (Markdown or dynamic TypeScript)
- **Tools** — Executable actions (shell commands or TypeScript scripts)
- **Prompts** — Reusable prompt templates with variable interpolation

## What does it do?

| Capability | Description |
|---|---|
| **Context Manager** | Install, update, list, and manage MCP contexts |
| **MCP Server** | Serve contexts via the Model Context Protocol (stdio transport) |
| **CLI Tool** | Commands for initialization, installation, and self-update |
| **Context Sources** | Install from MCPBay marketplace (slug), GitHub repos, or local disk |
| **Tool Execution** | Execute shell commands or sandboxed Deno TypeScript scripts |
| **Self-Update** | Binary replacement with multi-phase safety & rollback |

## Ecosystem

- **MCPBay** (`https://mcpbay.io`) — Central marketplace for discovering and publishing MCP contexts
- **MCPB API** (`https://papi.mcpbay.io`) — Backend API for downloading context packages
- **@mcpbay/contexts-manager** — Core library for loading, preparing, and executing contexts programmatically
- **@mcpbay/easy-mcp-server** — Easy-to-use MCP server framework

## Key Files

| File | Purpose |
|---|---|
| `main.ts` | CLI entry point using `commander` |
| `deno.json` | Project config, version, build tasks, import maps |
| `mcp-config.json` | User config file listing installed contexts |
| `context_modules/` | Directory where installed context versions live |

## CLI Version

Current version: **1.2.17** (defined in `deno.json`)
