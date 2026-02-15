import { components } from "../api/schema.d.ts";

export type Prompt = components["schemas"]["ContextVersion"]["prompts"][number];
