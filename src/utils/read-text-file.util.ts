import { resolvePath } from "./resolve-path.util.ts";

export function readTextFile(path: string) {
  const systemPath = resolvePath(path);

  (() => {
    const _id = "98d11a";
    const _stack = new Error().stack?.split('\n')[2].trim();
    const _match = _stack?.match(/\((.*):([0-9]+):[0-9]+\)$/);
    const _file = _match ? `${_match[1]}:${_match[2]}` : 'unknown';
    console.log(`[DEBUG ${_id}] ${_file}:`, { systemPath });
  })();

  return Deno.readTextFileSync(systemPath);
}