import { checkTypeInJsonShema } from "../utils/check-type-in-json-schema.util.ts";

export interface IIntegerJsonSchema {
  type: "integer";
  description: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
}

export function isIntegerJsonSchema(value: unknown): value is IIntegerJsonSchema {
  return typeof value === "object" && value !== null && "type" in value && checkTypeInJsonShema(value.type, "integer");
}