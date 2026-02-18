import { checkConfigFileExists } from "../utils/check-config-file-exists.util.ts";
import { fileExists } from "../utils/file-exists.util.ts";
import { saveConfiFile } from "../utils/save-config-file.util.ts";

const DEFAULT_AGENTS_MD_CONTENT = `
## MCPB MCP guidelines
- Always check the resources description to check if you need to read some of them for the task.
`.trim();

function getAgentsMdPath() {
  const cwd = Deno.cwd();
  return `${cwd}/AGENTS.md`;
}

function isAgentsMDPresent() {
  const agentsFilePath = getAgentsMdPath();
  const isAgentsMdPresent = fileExists(agentsFilePath);

  return isAgentsMdPresent;
}

function createAgentsMd() {
  const agentsFilePath = getAgentsMdPath();
  Deno.writeTextFileSync(agentsFilePath, DEFAULT_AGENTS_MD_CONTENT);

  console.log("AGENTS.md created and required prompt content added.");
}

function injectAgentsMdContent() {
  const agentsFilePath = getAgentsMdPath();
  const agentsContent = Deno.readTextFileSync(agentsFilePath).trim();

  if (agentsContent.includes(DEFAULT_AGENTS_MD_CONTENT)) {
    console.log("AGENTS.md already contains the required MCPB prompt to work correctly.");

    return;
  }

  const updatedContent = (() => {
    if (!agentsContent) {
      return DEFAULT_AGENTS_MD_CONTENT;
    }

    return `${agentsContent}\n\n${DEFAULT_AGENTS_MD_CONTENT}`;
  })();

  Deno.writeTextFileSync(agentsFilePath, updatedContent);
  console.log("AGENTS.md updated and required prompt content added.");
}

export function initCommand() {
  if (isAgentsMDPresent()) {
    injectAgentsMdContent();
  } else {
    createAgentsMd();
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
    console.log("You can start importing contexts using the 'mcpb add' command.");
  }
}