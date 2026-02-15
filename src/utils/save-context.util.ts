export function saveContext(context: object, path: string) {
  const json = JSON.stringify(context, null, 2);
  Deno.writeTextFileSync(path, json);
}