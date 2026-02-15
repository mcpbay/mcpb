export function camelCaseToSnakeCase(text: string) {
  return text.replace(/([A-Z])/g, "_$1").toLowerCase();
}