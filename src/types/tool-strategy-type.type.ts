import { components } from "../api/schema.d.ts";

export type ToolStrategyType =
  components["schemas"]["ContextVersion"]["tools"][number]["execution"][number][
    "type"
  ];
