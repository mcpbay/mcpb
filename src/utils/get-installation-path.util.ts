export function getInstallationPath(): string {
  const os = Deno.build.os;

  if (os === "windows") {
    const localAppData = Deno.env.get("LOCALAPPDATA");

    if (!localAppData) {
      throw new Error("LOCALAPPDATA environment variable not found.");
    }

    return `${localAppData}\\Programs\\mcpb\\mcpb.exe`;
  }

  const home = Deno.env.get("HOME");

  if (!home) {
    throw new Error("HOME environment variable not found.");
  }

  const isRoot = typeof Deno.uid === "function" && Deno.uid() === 0;

  if (isRoot) {
    return "/usr/local/bin/mcpb";
  }

  return `${home}/.local/bin/mcpb`;
}
