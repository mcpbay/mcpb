import { checkTypeInJsonShema } from "../utils/check-type-in-json-schema.util.ts";

export interface IStringJsonSchema {
  type: "string";
  description: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  enum?: string[];
}

export function isStringJsonSchema(value: unknown): value is IStringJsonSchema {
  return typeof value === "object" && value !== null && "type" in value &&
    checkTypeInJsonShema(value.type, "string");
}
