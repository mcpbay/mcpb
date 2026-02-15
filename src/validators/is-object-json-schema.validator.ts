import { checkTypeInJsonShema } from "../utils/check-type-in-json-schema.util.ts";

export interface IJsonSchemaElement {
  type: string;
  default?: any;
}


export interface IObjectJsonSchema {
  type: "object";
  properties: Record<string, IJsonSchemaElement>;
  required?: string[];
}

export function isObjectJsonSchema(value: unknown): value is IObjectJsonSchema {
  return typeof value === "object" && value !== null && "type" in value && checkTypeInJsonShema(value.type, "object") && "properties" in value && typeof value.properties === "object";
}