export function checkTypeInJsonShema(value: unknown, type: string) {
  const valueIsString = typeof value === "string";
  const valueIsArray = Array.isArray(value);
  
  return valueIsString && value === type || valueIsArray && value.includes(type);
}