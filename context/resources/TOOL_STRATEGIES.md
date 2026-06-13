---
name: tool_strategies
description: Tool execution strategies — local (shell commands) and local-script (TypeScript via Deno subprocess). Read MCP_SERVER first.
title: Tool Strategies
mimeType: text/markdown
---

# MCPB CLI — Tool Execution Strategies

## Overview

Each tool in a context can have one or more **execution strategies**. Strategies are tried in order; if a strategy returns `true` (not applicable), the next one is attempted. This allows fallback for different platforms.

Two strategy types exist:

## 1. Local Strategy (`type: "local"`)

Executes shell commands on the host system.

### Handler: `handleLocalStrategy()`

### Flow

```
1. Check strategy.type === "local"
2. Check OS compatibility (config.environment.os)
3. Check required apps exist (config.environment.requires)
4. Apply placeholders to command:
   - {{PATH_PLACEHOLDER}} → temp dir, cwd, workspace, etc.
   - {{arg.param_name}} → from tool arguments
   - {{env.VAR_NAME}} → from context variables
5. Execute command via Deno.Command
6. If runInShell is true: use specified shell (powershell, cmd, zsh, bash)
7. If successCriteria is present:
   a. Check exit code
   b. Check response matches regex patterns
   c. If outputFormat === "json": parse JSON, apply outputMapping
   d. If outputFormat === "file": verify output file exists
8. Return ToolCallResponse
```

### Config Type: `ToolStrategyLocalConfig`

```typescript
interface ToolStrategyLocalConfig {
  commands: string[];           // Shell commands to execute
  workingDirectory?: string;    // CWD for the command (supports placeholders)
  timeout?: number;             // Execution timeout in ms (default: 15000)
  runInShell?: boolean;         // Use specified shell
  environment: {
    os: string[];               // Compatible OSes: "windows", "darwin", "linux"
    requires: string[];         // Required apps (e.g., ["git", "node"])
    shell: string;              // Shell to use: "powershell", "cmd", "zsh", "bash"
  };
  successCriteria?: {
    exitCode: number;           // Expected exit code (default: 0)
    responseMatches?: string[]; // Regex patterns stdout must match
    outputFormat?: "json" | "file";  // Expected output format
    outputFilePath?: string;    // For file output: path to generated file
    outputMapping?: Record<string, string>; // Maps JSON fields to outputSchema
  };
  deterministic?: boolean;      // If true, responses are cached
}
```

### JSON Output Mapping

When `outputFormat === "json"` and the tool has an `outputSchema`, `JsonSchemaMapper` is used:

```typescript
// Schema properties
{ "field1": { "type": "string" }, "field2": { "type": "number" } }

// outputMapping
{ "field1": "{{arg.source_field}}", "field2": "literal_value" }

// Gets the value from the JSON output or the literal
const result = mapper.getOutput();
```

## 2. Local Script Strategy (`type: "local-script"`)

Executes TypeScript code in a Deno subprocess with sandboxed permissions.

### Handler: `handleLocalScriptStrategy()`

### Flow

```
1. Check strategy.type === "local-script"
2. Validate language === "ts"
3. Extract workspacePath argument (must be valid file:// URI)
4. Remove built-in workspacePath from args
5. Call tsExecute() with:
   - TypeScript code from config.code
   - Permissions from context.json
   - Invoke: { function: "toolHandler", arguments: [fixedArgs] }
6. Deno subprocess runs the code
7. Last line of stdout is parsed as JSON
8. Returns the parsed result
```

### Config Type: `ToolLocalScriptStrategyConfig`

```typescript
interface ToolLocalScriptStrategyConfig {
  language: "ts" | "js";
  code: string;                    // TypeScript source code
  timeout?: number;                // Execution timeout in ms (default: 10000)
  configFilePath?: string;         // Path to deno.json for imports
  allowReadProject?: boolean;      // --allow-read (default: true)
  allowWriteProject?: boolean;     // --allow-write (default: true)
  allowedDomains?: string[];       // --allow-net domains
  allowedPackages?: string[];      // Allowed npm/jsr packages
  allowedAppsToExecute?: string[]; // --allow-run apps
  allowedEnvironments?: string[];  // Allowed env vars
}
```

## TypeScript Execution (`tsExecute`)

The `tsExecute()` function in `src/utils/ts-execute.util.ts`:

1. If no `configFilePath`: removes static imports from the code (since `--config` isn't used)
2. Replaces `import()` with `_mcpb_import()` — a sandboxed import function that checks against `allowedPackages`
3. Appends invocation code to call `toolHandler()` and JSON.stringify the result
4. Writes the modified code to a temp file
5. Spawns `deno run` with calculated permissions:
   - `--allow-read=./,<tempDir>` (if allowRead)
   - `--allow-write=./,<tempDir>` (if allowWrite)
   - `--allow-net=<domains>` (if allowedDomains)
   - `--allow-run=<apps>` (if allowedExecutables)
   - `--config=<path>` (if configFilePath)
   - `--allow-env=TMPDIR,TMP,TEMP`
   - `--unstable-kv`
6. Kills the process after `timeout` (SIGKILL)
7. Returns `{ outMessage, codeFilePath }`

### Sandbox Security

- Static imports are removed to prevent import hijacking
- Dynamic `import()` is replaced with a whitelist-checked wrapper
- Subprocess runs with Deno's permission system
- Temp files are cleaned up after execution
