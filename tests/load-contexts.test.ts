import { assertEquals } from "@std/assert";
import { loadContextsFromConfigFile } from "../src/utils/load-contexts-from-config-file.util.ts";
import { ContextVersion } from "../src/types/context-version.type.ts";

const configPath = new URL("test-mcp-config.json", import.meta.url).href;

Deno.test("loadContextsFromConfigFile - should load all old JSON format contexts", async () => {
  const contexts = await loadContextsFromConfigFile(configPath, false);

  assertEquals(contexts.length, 3);

  const gitChangelog = contexts.find((c) => c.context.slug === "git-changelog")!;
  assertEquals(gitChangelog.version, "1.0.0");
  assertEquals(gitChangelog.tools.length, 1);
  assertEquals(gitChangelog.tools[0].name, "git_changelog_manager");

  const projectMetadata = contexts.find((c) => c.context.slug === "project-metadata-manager")!;
  assertEquals(projectMetadata.version, "1.0.0");
  assertEquals(projectMetadata.tools.length, 1);
  assertEquals(projectMetadata.tools[0].name, "project_metadata_manager");

  const tsUtilities = contexts.find((c) => c.context.slug === "typescript-utilities")!;
  assertEquals(tsUtilities.version, "1.0.4");
  assertEquals(tsUtilities.resources.length, 3);
  assertEquals(tsUtilities.tools.length, 0);
});

Deno.test("loadContext - should load each old JSON context individually", async () => {
  const paths = [
    { slug: "git-changelog", version: "1.0.0", toolCount: 1, resourceCount: 0, promptCount: 0 },
    { slug: "project-metadata-manager", version: "1.0.0", toolCount: 1, resourceCount: 0, promptCount: 0 },
    { slug: "typescript-utilities", version: "1.0.4", toolCount: 0, resourceCount: 3, promptCount: 0 },
  ];

  for (const { slug, version, toolCount, resourceCount, promptCount } of paths) {
    const contextPath = new URL(`context_modules/${slug}/${version}.json`, import.meta.url).href;

    const text = await Deno.readTextFile(new URL(contextPath));
    const context = JSON.parse(text) as ContextVersion;

    assertEquals(context.context.slug, slug);
    assertEquals(context.version, version);
    assertEquals(context.tools.length, toolCount);
    assertEquals(context.resources.length, resourceCount);
    assertEquals(context.prompts.length, promptCount);

    if (context.tools.length > 0) {
      for (const tool of context.tools) {
        assertEquals(typeof tool.name, "string");
        assertEquals(typeof tool.description, "string");
        assertEquals(typeof tool.inputSchema, "object");
      }
    }

    if (context.resources.length > 0) {
      for (const resource of context.resources) {
        assertEquals(typeof resource.name, "string");
        assertEquals(typeof resource.uri, "string");
        assertEquals(typeof resource.text, "string");
      }
    }
  }
});
