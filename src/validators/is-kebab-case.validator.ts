export function isKebabCase(str: string): boolean {
  return /^[a-z]+(-[a-z]+)*$/.test(str);
}