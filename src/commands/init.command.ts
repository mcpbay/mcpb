import { checkConfigFileExists } from "../utils/check-config-file-exists.util.ts";
import { fileExists } from "../utils/file-exists.util.ts";
import { saveConfiFile } from "../utils/save-config-file.util.ts";

const DEFAULT_AGENTS_MD_CONTENT = `
## MCPB MCP guidelines
- Always check the resources description to check if you need to read some of them for the task.
`.trim();

const CLAUDE_MD_REQUIRED_PROMPT_CONTENT = `
## MCPB MCP guidelines
- Read the \`AGENTS.md\` file and follow its instructions.
`.trim();

function getAgentsMdPath() {
  const cwd = Deno.cwd();
  return `${cwd}/AGENTS.md`;
}

function getClaudeMdPath() {
  const cwd = Deno.cwd();
  return `${cwd}/CLAUDE.md`;
}

function isMDPresent(mdPath: string) {
  const isAgentsMdPresent = fileExists(mdPath);

  return isAgentsMdPresent;
}

function injectMdContent(filePath: string, fileName: string, content: string) {
  const agentsContent = Deno.readTextFileSync(filePath).trim();

  if (agentsContent.includes(content)) {
    console.log(`${fileName} already contains the required MCPB prompt to work correctly.`);

    return;
  }

  const updatedContent = (() => {
    if (!agentsContent) {
      return content;
    }

    return `${agentsContent}\n\n${content}`;
  })();

  Deno.writeTextFileSync(filePath, updatedContent);
  console.log(`${fileName} updated and required prompt content added.`);
}

export function initCommand(options: Record<string, unknown>) {
  const withClaude = "withClaude" in options;
  const agentsMdPath = getAgentsMdPath();
  const claudeMdPath = getClaudeMdPath();
  const isClaudeMdPresent = isMDPresent(claudeMdPath);

  if (withClaude) {
    if (isClaudeMdPresent) {
      injectMdContent(claudeMdPath, "CLAUDE.md", CLAUDE_MD_REQUIRED_PROMPT_CONTENT);
    } else {
      Deno.writeTextFileSync(claudeMdPath, CLAUDE_MD_REQUIRED_PROMPT_CONTENT);
      console.log("CLAUDE.md created and required prompt content added.");
    }
  } else {
    if (isClaudeMdPresent) {
      console.log("CLAUDE.md file detected!");
      console.log("Run the `mcpb init --with-claude` to update the CLAUDE.md file and make it work with MCPB correctly.");
      console.log("");
    }
  }

  if (isMDPresent(agentsMdPath)) {
    injectMdContent(agentsMdPath, "AGENTS.md", DEFAULT_AGENTS_MD_CONTENT);
  } else {
    Deno.writeTextFileSync(agentsMdPath, DEFAULT_AGENTS_MD_CONTENT);
    console.log("AGENTS.md created and required prompt content added.");
  }

  try {
    checkConfigFileExists();
    console.log("MCPB CLI project already initialized.");
  } catch {
    saveConfiFile({ imports: {} });
    console.log("MCPB CLI project initialized!");
    console.log("");
    console.log("Check the marketplace to start using contexts:");
    console.log("https://mcpbay.io/marketplace");
    console.log("");
    console.log("You can start importing contexts using the `mcpb add` command.");
    console.log("");
    console.log("If you didn't install the MCPB MCP server on your AI tool, you can install it using the `mcpb install-mcp` command.");
    console.log("For Claude Code: `mcpb install-mcp claudecode`");
  }
}