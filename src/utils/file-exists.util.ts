export function fileExists(path: string): boolean {
  try {
    const filePath = path.startsWith("file://") ? new URL(path) : path;
    Deno.statSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
}
