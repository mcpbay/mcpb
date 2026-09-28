import { loadConfigFile } from "../utils/load-config-file.util.ts";
import { saveConfiFile } from "../utils/save-config-file.util.ts";
import { getDirname } from "../utils/get-dirname.util.ts";
import { exists } from "../utils/exists.util.ts";
import { MdManager } from "../classes/md-manager.class.ts";
import { getAgentsMdPath } from "../utils/get-agents-md-path.util.ts";

export async function removeCommand(slug: string, options: Record<string, unknown>) {
  const { config: configPath } = options as { config: string };
  const config = loadConfigFile(configPath, { create: false });
  const importEntry = config.imports[slug];

  if (!importEntry) {
    console.log(`Context "${slug}" is not installed. Nothing to remove.`);

    return;
  }

  const cwd = getDirname(configPath);
  const contextModulesPath = `${cwd}/context_modules`;
  const slugDir = `${contextModulesPath}/${slug}`;

  if (exists(slugDir, true)) {
    Deno.removeSync(slugDir, { recursive: true });
    console.log(`Removed context files for "${slug}".`);
  }

  delete config.imports[slug];
  saveConfiFile(config, configPath);

  const agentsMdPath = getAgentsMdPath();

  if (exists(agentsMdPath)) {
    const contextVersionPromptTitle = `MCPBay - \`${slug}\` prompt`;
    const mdManager = new MdManager(agentsMdPath);

    try {
      mdManager.deleteSection(contextVersionPromptTitle);
      console.log(`Removed section "${contextVersionPromptTitle}" from AGENTS.md.`);
    } catch {
      console.log(`No section found for "${contextVersionPromptTitle}" in AGENTS.md.`);
    }
  }

  console.log(`Context "${slug}" removed successfully.`);
}
