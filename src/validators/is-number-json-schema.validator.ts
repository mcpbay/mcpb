import { checkTypeInJsonShema } from "../utils/check-type-in-json-schema.util.ts";

export interface INumberJsonSchema {
  type: "number";
  description: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
}

export function isNumberJsonSchema(value: unknown): value is INumberJsonSchema {
  return typeof value === "object" && value !== null && "type" in value &&
    checkTypeInJsonShema(value.type, "number");
}
