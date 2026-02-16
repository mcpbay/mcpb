import { Command } from 'commander';
import { addCommand } from "./src/commands/add.command.ts";
import { startMcpCommand } from "./src/commands/start-mcp.command.ts";
import { versionCommand } from "./src/commands/version.command.ts";

const program = new Command();

program
  .command('-v')
  .alias('--version')
  .description('Get the current version.')
  .action(versionCommand);

program
  .command('add <slug>')
  .description('Install a new context.')
  .action(addCommand);

program
  .command('start-mcp [config-path]')
  .description('Initializes the MCP server with all the previously installed contexts.')
  .action(startMcpCommand);

program.parse();