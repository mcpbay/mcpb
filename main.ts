import { Command, Option, Argument } from "commander";
import { addCommand } from "./src/commands/add.command.ts";
import { startMcpCommand } from "./src/commands/start-mcp.command.ts";
import { selfUpdateCommand } from "./src/commands/self-update.command.ts";
import { clearUpdateScriptFile } from "./src/utils/generate-update-script-file.util.ts";
import { validateVersion } from "./src/utils/validate-version.util.ts";
import { getVersion } from "./src/utils/get-version.util.ts";
import { initCommand } from "./src/commands/init.command.ts";
import { installMcpCommand, InstallMCPTarget } from "./src/commands/install-mcp.command.ts";

const program = new Command();
const version = getVersion();
const configOption =
  new Option(
    "-c, --config <path>",
    "Path to the config file."
  )
    .default("./mcp-config.json");

clearUpdateScriptFile();
await validateVersion();

program
  .version(`v${version}`, "-v, --version", "Get the current version.");

program
  .command("init")
  .description("Initialize the MCPB CLI project.")
  .option("--with-claude", "Injects the MCPB prompt to CLAUDE.md file.", Boolean)
  .action(initCommand);

program
  .command("self-update")
  .description("Update the MCPB CLI tool.")
  .action(selfUpdateCommand);

// program
//   .addOption(new Option('--connect-to <target>', 'Connects the MCPB MCP server to an AI tool.').choices(['ClaudeCode', 'OpenCode']))

const connectToChoises = Object.values(InstallMCPTarget);
const availableTargets = connectToChoises.map(choise => `\`${choise}\``).join(", ");

program
  .command("install-mcp")
  .addArgument(new Argument("target").choices(connectToChoises))
  .description(`Installs the MCPB MCP server to an AI tool.\nAvailable targets: ${availableTargets}.`)
  .option("--mcp-name <name>", "The name of the MCP server.")
  .action(installMcpCommand);

program
  .command("add <slug>")
  .description("Install a new context.")
  .addOption(configOption)
  .action(addCommand);

program
  .command("start-mcp")
  .addOption(configOption)
  .description("Initializes the MCP server with all the previously installed contexts.")
  .action(startMcpCommand);

program
  .parse();
