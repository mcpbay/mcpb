export function writeJsonToFile(path: string, json: object) {
  const jsonStr = JSON.stringify(json, null, 2);
  Deno.writeTextFileSync(path, jsonStr);
}