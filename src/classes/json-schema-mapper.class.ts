import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import { IObjectJsonSchema, isObjectJsonSchema } from "../validators/is-object-json-schema.validator.ts";
import { INTERNAL_ERROR } from "@mcpbay/easy-mcp-server/constants";

const ARGS_PATTERN = /\{\{arg\.([\w_]+)\}\}/g;

/**
 * Extracts the args from a string.
 * Ej. "{{arg.param_1}}/{{arg.param_2}}/foo"
 * Returns: ["param_1", "param_2"]
 * @param text The text to extract the args from.
 * @returns The args.
 */
function extractArgs(text: string): string[] {
  return text.match(ARGS_PATTERN) ?? [];
}

function convertByType(type: string, value: string) {
  switch (type) {
    case "number":
    case "integer":
      return Number(value) ?? 0;
    case "boolean":
      return value === "true" || !!value;
    case "string":
      return value;
    default:
      return null;
  }
}

export class JsonSchemaMapper {

  private readonly argumentNames!: string[];

  constructor(
    private readonly schema: IObjectJsonSchema,
    private readonly mapSchema: Record<string, string>,
    private readonly objectReference: Record<string, unknown>,
  ) {
    const isJsonObjectSchema = isObjectJsonSchema(this.schema);

    crashIfNot(isJsonObjectSchema, {
      code: INTERNAL_ERROR,
      message: "Invalid json schema."
    });

    this.argumentNames = Object.keys(this.schema.properties);
  }

  /**
   * Returns the value of an argument.
   * @param name The name of the argument.
   * @returns The value of the argument.
   */
  getArgumentValue(name: string) {
    const arg = this.schema.properties[name];

    crashIfNot(typeof arg !== "undefined", {
      code: INTERNAL_ERROR,
      message: `Invalid argument name: ${name}.`
    });

    const argSchema = this.mapSchema[name];

    if (typeof argSchema === "undefined") {
      return this.objectReference[name] ?? arg.default;
    }

    const args = extractArgs(argSchema);

    if (args.length === 0) {
      return convertByType(arg.type, argSchema) ?? arg.default;
    }

    if (args.length === 1) {
      return this.objectReference[args[0]];
    }

    // More than 1 args means the value is an string.

    return argSchema.replace(ARGS_PATTERN, (_, placeholder) => String(this.objectReference[placeholder] ?? ""));
  }

  getOutput() {
    const output: Record<string, unknown> = {};

    this.argumentNames.forEach((name) => {
      const value = this.getArgumentValue(name);

      if (value === undefined) {
        return;
      }

      output[name] = value;
    });

    return output;
  }
}