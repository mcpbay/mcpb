import pkg from "../../deno.json" with { type: "json" };

export function versionCommand() {
  const version = pkg.version;
  console.log(`v${version}`);
}
