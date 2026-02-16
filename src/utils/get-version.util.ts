import pkg from "../../deno.json" with { type: "json" };

export function getVersion() {
  return pkg.version;
}
