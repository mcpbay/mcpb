export const PROMPT_ARGUMENT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    required: { type: "boolean" },
  },
  required: ["name", "description"],
};

export const PROMPT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    arguments: {
      type: "array",
      items: PROMPT_ARGUMENT_SCHEMA,
    },
  },
  required: ["name", "description"],
};
