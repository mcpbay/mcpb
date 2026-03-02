import { Argument, Command, Option } from "commander";
import { addCommand } from "./src/commands/add.command.ts";
import { startMcpCommand } from "./src/commands/start-mcp.command.ts";
import { selfUpdateCommand } from "./src/commands/self-update.command.ts";
import { clearUpdateScriptFile } from "./src/utils/generate-update-script-file.util.ts";
import { validateVersion } from "./src/utils/validate-version.util.ts";
import { getVersion } from "./src/utils/get-version.util.ts";
import { initCommand } from "./src/commands/init.command.ts";
import {
  installMcpCommand,
  InstallMCPTarget,
} from "./src/commands/install-mcp.command.ts";
import { executeTs } from "./src/sandboxes/typescript.sandbox.ts";

// const code = `
// /**
//  * Yeah... I wrote this by hand...
//  **/

// const { isUndefined } = await import("jsr:@online/is");
// const { existsSync } = await import("jsr:@std/fs/exists");

// enum ResultStatus {
//   FILE_NOT_FOUND = "file_not_found",
//   SUCCESS = "success",
//   COMPLETED  = "completed",
//   FAILED = "failed"
// }

// function getMetadataPath() {
//   const cwd = Deno.cwd();
//   const metadataPath = \`\${cwd}/project-metadata.json\`;

//   return metadataPath;
// }

// function loadMetadata() {
//   const metadataPath = getMetadataPath();

//   if(!existsSync(metadataPath, { isFile: true })) {
//     return saveMetadata({});
//   }

//   const metadataContent = Deno.readTextFileSync(metadataPath);

//   return JSON.parse(metadataContent);
// }

// function saveMetadata(metadata: Record<string, unknown>) {
//   const metadataPath = getMetadataPath();

//   Deno.writeTextFileSync(metadataPath, JSON.stringify(metadata, null, 2), { create: true });

//   return metadata;
// }

// export function toolHandler(args: Record<string, unknown>) {
//   const { path, action, metadata } = args;
//   const fullMetadata = loadMetadata();

//   switch(action) {
//     case "write":
//       if(isUndefined(metadata)) {
//         return { status: ResultStatus.FAILED, error_description: "\`metadata\` is \`undefined\`. Value required." };
//       } else if (metadata === "") {
//         return { status: ResultStatus.FAILED, error_description: "\`metadata\` is empty. Value required." };
//       }

//       fullMetadata[path] = metadata;

//       saveMetadata(fullMetadata);

//       return { status: ResultStatus.COMPLETED };
//     case "read": {
//       const fileMetadata = fullMetadata[path];

//       if(isUndefined(fileMetadata)) {
//         return { status: ResultStatus.FILE_NOT_FOUND };
//       }

//       return { status: ResultStatus.SUCCESS, metadata: fileMetadata };
//     }
//   }
// }
// `;

// const res = await executeTs(
//   code,
//   {
//     fn: {
//       functionName: "toolHandler",
//       args: [{ "action": "write", "path": "icon.ico", "metadata": "This is an icon file for the application." }]
//     },
//     timeout: 5000,
//     permissions: {
//       read: [Deno.cwd()],
//       write: [Deno.cwd()],
//       env: [],
//       import: ["jsr.io:443", "npmjs.com:443", "deno.land:443"],
//       run: false,
//       net: [],
//     },
//     allowedPackages: ["jsr:@online/is", "jsr:@std/fs/exists"]
//   }
// );

// (() => {
//   const _id = "2bd1dd";
//   const _stack = new Error().stack?.split('\n')[2].trim();
//   const _match = _stack?.match(/\((.*):([0-9]+):[0-9]+\)$/);
//   const _file = _match ? `${_match[1]}:${_match[2]}` : 'unknown';
//   console.log(`[DEBUG ${_id}] ${_file}:`, res);
// })();

const program = new Command();
const version = getVersion();
const configOption = new Option(
  "-c, --config <path>",
  "Path to the config file.",
)
  .default("./mcp-config.json");

const debugOption = new Option(
  "-d, --debug <path>",
  "Path to the debug file.",
)
  .default("./logs/mcpb.log");

clearUpdateScriptFile();
await validateVersion();

program
  .version(`v${version}`, "-v, --version", "Get the current version.");

program
  .command("init")
  .description("Initialize the MCPB CLI project.")
  .option(
    "--with-claude",
    "Injects the MCPB prompt to `CLAUDE.md` file.",
    Boolean,
  )
  .action(initCommand);

program
  .command("self-update")
  .description("Update the MCPB CLI tool.")
  .action(selfUpdateCommand);

// program
//   .addOption(new Option('--connect-to <target>', 'Connects the MCPB MCP server to an AI tool.').choices(['ClaudeCode', 'OpenCode']))

const connectToChoises = Object.values(InstallMCPTarget);
const availableTargets = connectToChoises.map((choise) => `\`${choise}\``).join(
  ", ",
);

program
  .command("install-mcp")
  .addArgument(new Argument("target").choices(connectToChoises))
  .description(
    `Installs the MCPB MCP server to an AI tool.\nAvailable targets: ${availableTargets}.`,
  )
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
  .description(
    "Initializes the MCP server with all the previously installed contexts.",
  )
  .action(startMcpCommand);

program
  .parse();
