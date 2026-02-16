import { components } from "../api/schema.d.ts";

export type Resource =
  components["schemas"]["ContextVersion"]["resources"][number];
