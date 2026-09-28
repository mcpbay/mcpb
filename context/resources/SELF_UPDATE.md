---
name: self_update
description: Multi-phase binary replacement update mechanism with rollback safety. Read ARCHITECTURE first.
title: Self-Update System
mimeType: text/markdown
---

# MCPB CLI — Self-Update System

## Overview

The self-update mechanism (`mcpb self-update`) is a multi-phase binary replacement system designed for maximum safety. It uses environment variables as flags to control execution flow across multiple invocations of the binary.

## Architecture

The system is implemented in `src/commands/self-update.command.ts` and uses:

| Component | Description |
|---|---|
| `INTENTION_FLAG_UID` | Env var flag name; its value determines what phase to execute |
| Phase values | `"f26b52..."` = self-replace, `"461457..."` = delete update binary |
| `GITHUB_TOKEN` | Optional env var for accessing private GitHub releases |
| Update binary | Downloaded alongside the real binary as `<name>.update.exe` (or `.update`)|
| Restore backup | A copy of the original binary saved as `<name>.backup.exe` |

## Phases

### Phase 0: Pre-flight (`selfUpdateCommand`)

1. Reads current version from `Deno.execPath()` via `getVersion()`
2. Fetches latest release from GitHub API: `https://api.github.com/repos/mcpbay/mcpb/releases/latest`
3. If the latest version is not newer → exits with message
4. Determines the correct binary filename for the current OS/architecture
5. Downloads the new binary with progress display
6. **Generates an update script file** (platform-specific shell script/batch file)
7. Spawns the update script **without waiting** (detached)
8. Exits the current process

### Phase 1: Self-Replacement (update script + `INTENTION_FLAG_UID = self-replace`)

The update script:
1. Waits for the original process to fully exit
2. Moves the current binary to `<name>.backup.exe`
3. Moves the downloaded update binary to the original binary path
4. Executes the (now replaced) binary with `INTENTION_FLAG_UID = delete-update`
5. Exits

The new binary runs and sees the `self-replace` flag. It knows it's the new version.

### Phase 2: Cleanup (`INTENTION_FLAG_UID = delete-update`)

The replaced binary:
1. Deletes the update binary file (which is itself — can't happen, it was already moved)
2. Actually: deletes the `.update` file, the backup file, and the update script
3. Prints "Update completed!"
4. Exits

### Phase 3: Next Normal Run

On next normal invocation (no `INTENTION_FLAG_UID`):
1. Entry point calls `clearUpdateScriptFile()` which cleans up any leftover update scripts
2. Normal execution continues

## Rollback Safety

- If any phase fails, the backup binary is preserved
- The original binary is not removed until the new one is confirmed working (runs Phase 2)
- The update script handles all file operations atomically (move, not copy-then-delete)

## OS-Specific Scripts

| OS | Script Type | Shell |
|---|---|---|
| Windows | `.bat` batch file | cmd.exe |
| macOS/Linux | Shell script | sh/bash |

## GitHub Release Asset Naming

| Platform | Asset Name |
|---|---|
| Windows x86_64 | `mcpb-windows.exe` |
| Linux aarch64 | `mcpb-linux-arm` |
| Linux x86_64 | `mcpb-linux-intel` |
| macOS aarch64 | `mcpb-mac-arm` |
| macOS x86_64 | `mcpb-mac-intel` |
