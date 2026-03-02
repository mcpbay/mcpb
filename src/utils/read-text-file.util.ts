export function readTextFile(path: string) {
  const isUri = path.startsWith("file://");
  const filePath = isUri ? new URL(path) : path;

  return Deno.readTextFileSync(filePath);
}