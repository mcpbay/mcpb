export function getClaudeMdPath() {
  const cwd = Deno.cwd();
  return `${cwd}/CLAUDE.md`;
}