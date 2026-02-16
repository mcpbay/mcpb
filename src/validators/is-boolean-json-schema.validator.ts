import { checkTypeInJsonShema } from "../utils/check-type-in-json-schema.util.ts";

export interface IBooleanJsonSchema {
  type: "boolean";
  description: string;
  default?: boolean;
}

export function isBooleanJsonSchema(
  value: unknown,
): value is IBooleanJsonSchema {
  return typeof value === "object" && value !== null && "type" in value &&
    checkTypeInJsonShema(value.type, "boolean");
}
