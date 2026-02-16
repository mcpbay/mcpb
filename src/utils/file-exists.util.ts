export function fileExists(path: string): boolean {
  try {
    Deno.statSync(path);
    return true;
  } catch (e) {
    return false;
  }
}
