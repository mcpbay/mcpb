import { Command } from "commander";
import { addCommand } from "./src/commands/add.command.ts";
import { startMcpCommand } from "./src/commands/start-mcp.command.ts";
import { selfUpdateCommand } from "./src/commands/self-update.command.ts";
import { clearUpdateScriptFile } from "./src/utils/generate-update-script-file.util.ts";
import { validateVersion } from "./src/utils/validate-version.util.ts";
import { getVersion } from "./src/utils/get-version.util.ts";

const program = new Command();

clearUpdateScriptFile();
await validateVersion();

program
  .version(`v${getVersion()}`, "-v, --version", "Get the current version.");

program
  .command("self-update")
  .description("Update the CLI tool.")
  .action(selfUpdateCommand);

program
  .command("add <slug>")
  .description("Install a new context.")
  .action(addCommand);

program
  .command("start-mcp [config-path]")
  .description(
    "Initializes the MCP server with all the previously installed contexts.",
  )
  .action(startMcpCommand);

program.parse();
