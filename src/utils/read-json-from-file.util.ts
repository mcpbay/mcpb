export function readJsonFromFile<T>(path: string): T {
  const json = Deno.readTextFileSync(path);
  return JSON.parse(json) as T;
}