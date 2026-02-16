export function snakeCaseToCamelCase(text: string) {
  return text.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace("-", "").replace("_", "");
  });
}
