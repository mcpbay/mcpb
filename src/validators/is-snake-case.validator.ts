export function isSnakeCase(text: string) {
  return /^[a-z_][a-z0-9_]*$/i.test(text);
}