---
name: context_system
description: How contexts are loaded from config file, disk, GitHub, and the MCPBay marketplace. How tools/resources/prompts are mapped. Read ARCHITECTURE first.
title: Context System
mimeType: text/markdown
---

# MCPB CLI — Context System

## Context Storage Formats

### JSON-based Context
A single `.json` file at `context_modules/<slug>/<version>.json` containing the full `ContextVersion` object with all tools, resources, and prompts embedded.

### Directory-based Context
A directory at `context_modules/<slug>/<version>/` with the standard context structure:
```
<version>/
  context.json
  deno.json
  tools/
    my-tool.ts
  resources/
    MY_RESOURCE.md
    dynamic.ts
  prompts/
    my-prompt.md
```

## Loading Process (`loadContextsFromConfigFile`)

1. Reads `mcp-config.json` (or specified config path)
2. Iterates over `config.imports` entries
3. For each entry, calls `loadContext(slug, versionOrImport, options)`

### `loadContext` Logic

```typescript
function loadContext(context, versionOrImport, options) {
  // 1. Try JSON file first
  const jsonPath = `context_modules/${slug}/${version}.json`;
  if (exists(jsonPath)) return readJsonFromFile(jsonPath);

  // 2. Try directory-based context
  const dirPath = `context_modules/${slug}/${version}/`;
  if (exists(dirPath)) return loadContextFromDirectory(dirPath);

  // 3. Download if allowed (doNotDownload = false)
  await downloadAndInstallContextBySlug(...)
  return readJsonFromFile(jsonPath);
}
```

### Directory Context Mapping (`loadContextFromDirectory`)

When loading a directory-based context, each tool/resource/prompt is mapped:

**Tools:** Each `.ts` file is read and its code is embedded into the tool config as a `local-script` strategy. The tool's permissions come from `context.json`'s `deno` field.

**Resources:**
- Markdown `.md` files: parsed for YAML frontmatter (`name`, `description`, `title`, `mimeType`)
- TypeScript `.ts` files: executed dynamically at read time

**Prompts:**
- Markdown `.md` files: parsed for YAML frontmatter and content
- Content becomes the prompt's user message text

## Installation Sources

### MCPBay Marketplace (Slug)
```
mcpb add my-context
mcpb add my-context@1.0.0
```
- Downloads from `https://papi.mcpbay.io/v1/mcp/download/<slug>`
- Requires optional `MCPBAY_API_KEY` env var for private contexts
- Saves as JSON file: `context_modules/<slug>/<version>.json`
- Normalizes slug: `slug@version` → `{ slug: "slug", version: "1.0.0" }`
- Injects the context's `prompt` into `AGENTS.md` via `MdManager`

### GitHub Repository
```
mcpb add github://owner/repo
mcpb add https://github.com/owner/repo/tree/branch/path
mcpb add git@github.com:owner/repo.git
```
- Uses `@mcpbay/contexts-manager`'s `loadContextFromGitHub()` with GitHub Contents API
- Supports private repos with `GITHUB_TOKEN` env var
- Downloads entire directory, saves as directory-based context
- Config ref: `{ version, ref: "github://...", type: "remote" }`

### Local Disk
```
mcpb add /path/to/context
```
- Uses `@mcpbay/contexts-manager`'s `MCPContext` to load context
- Copies files to `context_modules/<slug>/<version>/`
- Config ref: `{ version, ref: "/path/to/context", type: "local" }`

## Config File (`mcp-config.json`)

```json
{
  "imports": {
    "typescript-utilities": "1.0.4",
    "git-changelog": "1.0.0",
    "my-custom-context": {
      "version": "1.0.0",
      "ref": "github://mcpbay/awesome-context",
      "type": "remote"
    },
    "local-context": {
      "version": "1.0.0",
      "ref": "/home/user/my-context",
      "type": "local"
    }
  },
  "envFile": ".env.mcpbay",
  "env": {
    "MCPBAY_API_KEY": "sk-...",
    "API_HOST": "https://custom-api.mcpbay.io"
  }
}
```

## AGENTS.md Injection

When a context is installed and has a `prompt` or `agents` property:
1. `MdManager` opens `AGENTS.md` in the workspace root
2. It creates/updates a section titled `MCPBay - \`<slug>\` prompt`
3. If the section content hasn't changed, it skips the write
4. This allows the LLM to see usage instructions for the installed context
