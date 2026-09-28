## MCPB MCP guidelines
- Always check the resources description to check if you need to read some of them for the task.

## MCPBay - `project-metadata-manager` prompt
1. Instead of read a file directly, try to use the metadata tool to get information of the file, if it does not exists, read the file and write the metadata. Keep the metadata of the file updated.

## MCPBay - `typescript-utilities` prompt
- Read the resources of this context to write high quality TypeScript code.

## MCPBay - `git-changelog` prompt
1. Everytime you finish a task: Use the `append` action of the `git_changelog_manager` tool to register your latest changes into the branch changelog.
2. Do never read the changelog (`read` action) until you going to push the changes to the remote repository.
3. When you're going to push the local project changes to the remote repository, read the whole changelog, summarize it and use the resume as the argument for the command `git commit -m`.

## MCPBay - `contexts-manager-api-reference` prompt
This context provides the full API reference of the `@mcpbay/contexts-manager` package.

## Available resources
- **API_REFERENCE** — Complete API reference of every exported class, interface, function, type, and utility.
- **HOWTO_BUILD_CONTEXT** — Guide explaining how to build a context project for LLMs.

## Available tools
- **init_context** — Scaffolds a new context project directory with default structure and examples.

## Available prompts
- **explain_context_architecture** — Explains the architecture of the contexts-manager package and how contexts work.
