export function applyArgs(text: string, args: Record<string, unknown>) {
  return text.replace(
    /\{\{(arg\.[\w_]+)\}\}/g,
    (_, placeholder) => String(args[placeholder] ?? ""),
  );
}