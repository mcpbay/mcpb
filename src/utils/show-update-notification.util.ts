interface IShowUpdateNotificationArguments {
  // The current version of the CLI
  currentVersion: string;
  // The latest available version
  latestVersion: string;
}

// [BY-AI] Displays a notification to the user when an update is available
// Shows the current version, latest version, and instructions to update
export function showUpdateNotification(args: IShowUpdateNotificationArguments) {
  const { currentVersion, latestVersion } = args;

  console.log("");
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║                    UPDATE AVAILABLE                       ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log(`║  Current version: v${currentVersion.padEnd(38)}  ║`);
  console.log(`║  Latest version:  ${latestVersion.padEnd(38)}  ║`);
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log("║  Run the following command to update:                     ║");
  console.log("║                                                           ║");
  console.log("║    mcpb self-update                                       ║");
  console.log("║                                                           ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");
  console.log("");
}
