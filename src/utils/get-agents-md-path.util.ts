export function getAgentsMdPath() {
  const cwd = Deno.cwd();
  return `${cwd}/AGENTS.md`;
}