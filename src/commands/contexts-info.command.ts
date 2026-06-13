import { loadContextsFromConfigFile } from "../utils/load-contexts-from-config-file.util.ts";
import { loadConfigFile } from "../utils/load-config-file.util.ts";
import type { ContextVersion } from "../types/context-version.type.ts";

interface IContextSummary {
  name: string;
  slug: string;
  version: string;
  description: string;
  type: string;
  tools: {
    name: string;
    description: string;
    permissions: Record<string, boolean | undefined>;
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
  permissions: {
    allowedPackages: string[];
    allowedExecutables: string[];
    allowedEnvironments: string[];
    allowedReadDirs: string[];
    allowedWriteDirs: string[];
    allowNetDomains: string[];
  };
}

function extractContextInfo(contextVersion: ContextVersion, contextName: string, contextSlug: string): IContextSummary {
  const tools = (contextVersion.tools ?? []).map((tool) => ({
    name: tool.name,
    description: tool.description,
    permissions: tool.permissions ?? {},
  }));

  const prompts = (contextVersion.prompts ?? []).map((prompt) => ({
    name: prompt.name,
    description: prompt.description,
  }));

  const resources = (contextVersion.resources ?? []).map((resource) => ({
    name: resource.name,
    uri: resource.uri,
    mimeType: resource.mimeType,
  }));

  const variables = (contextVersion.variables ?? []).map((variable) => ({
    name: variable.name,
    description: variable.description,
    required: variable.required,
    modifiable: variable.modifiable,
  }));

  const permissions = {
    allowedPackages: [],
    allowedExecutables: [],
    allowedEnvironments: [],
    allowedReadDirs: [],
    allowedWriteDirs: [],
    allowNetDomains: [],
  };

  return {
    name: contextName,
    slug: contextSlug,
    version: contextVersion.version,
    description: contextVersion.description ?? "",
    type: (contextVersion as Record<string, unknown>).context
      ? ((contextVersion as Record<string, unknown>).context as Record<string, unknown>).type as string
      : "unknown",
    tools,
    prompts,
    resources,
    variables,
    permissions,
  };
}

function formatJson(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}

export async function contextsInfoCommand(options: Record<string, any>) {
  const { config: configPath } = options;

  const config = loadConfigFile(configPath, { create: false });
  const importKeys = Object.keys(config.imports ?? {});

  const contexts = await loadContextsFromConfigFile(configPath, false);

  if (contexts.length === 0) {
    console.log("No contexts installed.");
    return;
  }

  const summaries: IContextSummary[] = contexts.map((cv, index) => {
    const raw = cv as Record<string, unknown>;
    const context = (raw.context ?? {}) as Record<string, unknown>;
    const slug = (context.slug as string) || importKeys[index] || "unknown";
    const name = (context.name as string) || slug;
    return extractContextInfo(cv, name, slug);
  });

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
    console.log(`  Type: ${summary.type}`);
    console.log(`  Description: ${summary.description}`);
    console.log("");

    if (summary.tools.length > 0) {
      console.log(`  Tools (${summary.tools.length}):`);
      for (const tool of summary.tools) {
        console.log(`    - ${tool.name}`);
        console.log(`      Description: ${tool.description}`);
        const permEntries = Object.entries(tool.permissions).filter(([, v]) => v);
        if (permEntries.length > 0) {
          console.log(`      Permissions: ${permEntries.map(([k, v]) => `${k}=${v}`).join(", ")}`);
        }
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
      type: s.type,
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
