import { loadContextsFromConfigFile } from "../utils/load-contexts-from-config-file.util.ts";
import type { ILoadableServerContext } from "../classes/mcp-server-context.class.ts";

interface IContextSummary {
  name: string;
  slug: string;
  version: string;
  description: string;
  tools: {
    name: string;
    description: string;
  }[];
  prompts: {
    name: string;
    description: string;
  }[];
  resources: {
    name: string;
    uri: string;
    mimeType: string;
  }[];
  variables: {
    name: string;
    description: string;
    required: boolean;
    modifiable: boolean;
  }[];
}

function extractContextInfo(context: ILoadableServerContext): IContextSummary {
  const tools = (context.tools ?? []).map((tool) => ({
    name: tool.name,
    description: tool.description,
  }));

  const prompts = (context.prompts ?? []).map((prompt) => ({
    name: prompt.name,
    description: prompt.description,
  }));

  const resources = (context.resources ?? []).map((resource) => ({
    name: resource.name,
    uri: resource.uri,
    mimeType: resource.mimeType,
  }));

  return {
    name: context.name,
    slug: context.slug,
    version: context.version,
    description: context.description ?? "",
    tools,
    prompts,
    resources,
    variables: [],
  };
}

function formatJson(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}

export async function contextsInfoCommand(options: Record<string, any>) {
  const { config: configPath } = options;

  const contexts = await loadContextsFromConfigFile(configPath, false);

  if (contexts.length === 0) {
    console.log("No contexts installed.");
    return;
  }

  const summaries: IContextSummary[] = contexts.map(extractContextInfo);

  const totalTools = summaries.reduce((acc, s) => acc + s.tools.length, 0);
  const totalPrompts = summaries.reduce((acc, s) => acc + s.prompts.length, 0);
  const totalResources = summaries.reduce((acc, s) => acc + s.resources.length, 0);

  console.log("=== Contexts Installed ===");
  console.log(`Total contexts: ${summaries.length}`);
  console.log(`Total tools: ${totalTools}`);
  console.log(`Total prompts: ${totalPrompts}`);
  console.log(`Total resources: ${totalResources}`);
  console.log("");

  for (const summary of summaries) {
    console.log(`--- ${summary.name} (${summary.slug}) ---`);
    console.log(`  Version: ${summary.version}`);
    console.log(`  Description: ${summary.description}`);
    console.log("");

    if (summary.tools.length > 0) {
      console.log(`  Tools (${summary.tools.length}):`);
      for (const tool of summary.tools) {
        console.log(`    - ${tool.name}`);
        console.log(`      Description: ${tool.description}`);
      }
      console.log("");
    }

    if (summary.prompts.length > 0) {
      console.log(`  Prompts (${summary.prompts.length}):`);
      for (const prompt of summary.prompts) {
        console.log(`    - ${prompt.name}`);
        console.log(`      Description: ${prompt.description}`);
      }
      console.log("");
    }

    if (summary.resources.length > 0) {
      console.log(`  Resources (${summary.resources.length}):`);
      for (const resource of summary.resources) {
        console.log(`    - ${resource.name}`);
        console.log(`      URI: ${resource.uri}`);
        console.log(`      MIME: ${resource.mimeType}`);
      }
      console.log("");
    }

    if (summary.variables.length > 0) {
      console.log(`  Variables (${summary.variables.length}):`);
      for (const variable of summary.variables) {
        console.log(`    - ${variable.name}`);
        console.log(`      Description: ${variable.description}`);
        console.log(`      Required: ${variable.required}`);
        console.log(`      Modifiable: ${variable.modifiable}`);
      }
      console.log("");
    }
  }

  console.log("=== JSON Output ===");
  console.log(formatJson({
    contexts: summaries.map((s) => ({
      name: s.name,
      slug: s.slug,
      version: s.version,
      description: s.description,
      toolsCount: s.tools.length,
      promptsCount: s.prompts.length,
      resourcesCount: s.resources.length,
      variablesCount: s.variables.length,
    })),
    summary: {
      totalContexts: summaries.length,
      totalTools,
      totalPrompts,
      totalResources,
    },
  }));
}
