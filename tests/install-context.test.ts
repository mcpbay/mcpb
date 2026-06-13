import { assertEquals, assertExists, assert } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { installContextFromDisk } from "../src/utils/install-context-from-disk.util.ts";
import { loadConfigFile } from "../src/utils/load-config-file.util.ts";
import { exists } from "../src/utils/exists.util.ts";
import { loadContext } from "../src/utils/load-context.util.ts";
import { loadContextsFromConfigFile } from "../src/utils/load-contexts-from-config-file.util.ts";
import { type IMcpPackage, type IImport } from "../src/interfaces/mcp-package.interface.ts";

const configUri = new URL("test-mcp-config.json", import.meta.url).href;
const configPath = configUri.replace("test-mcp-config.json", "test-imports-config.json");
const contextModulesPath = fromFileUrl(new URL("context_modules", import.meta.url));

function makeTempSourceDir(name: string, version: string): string {
  const tempDir = `${Deno.env.get("TEMP") ?? "/tmp"}/mcpb-test-src-${name}-${Date.now()}`;

  Deno.mkdirSync(`${tempDir}/tools`, { recursive: true });
  Deno.mkdirSync(`${tempDir}/resources`, { recursive: true });
  Deno.mkdirSync(`${tempDir}/prompts`, { recursive: true });

  const contextJson = {
    name,
    version,
    description: `Test context ${name} v${version}`,
    tags: ["test"],
  };

  Deno.writeTextFileSync(`${tempDir}/context.json`, JSON.stringify(contextJson, null, 2));

  return tempDir;
}

function cleanup(...paths: string[]) {
  for (const path of paths) {
    try {
      Deno.removeSync(path, { recursive: true });
    } catch {
    }
  }
}

function createTestConfig(configPath: string, imports: Record<string, string | IImport>) {
  const config = { imports } satisfies IMcpPackage;

  Deno.writeTextFileSync(
    new URL(configPath),
    JSON.stringify(config, null, 2),
  );

  return config;
}

Deno.test("installContextFromDisk - should copy a context and register as IImport", async () => {
  const testContextName = "test-disk-context";
  const testContextVersion = "2.0.0";
  const sourceDir = makeTempSourceDir(testContextName, testContextVersion);

  try {
    const config = createTestConfig(configPath, {});
    const result = await installContextFromDisk(sourceDir, {
      configPath,
      contextModulesPath,
      config,
      force: true,
    });

    const hasTypeScriptScripts = result.hasTypeScriptScripts;
    assertEquals(hasTypeScriptScripts, false);

    const configReload = loadConfigFile(configPath, { reload: true, create: false });
    const storedImport = configReload.imports[testContextName];

    assert(storedImport && typeof storedImport !== "string", "Expected IImport object");

    assertEquals(storedImport.version, testContextVersion);
    assertEquals(storedImport.ref, sourceDir);
    assertEquals(storedImport.type, "local");

    const targetDir = `${contextModulesPath}/${testContextName}/${testContextVersion}`;

    assert(exists(targetDir, true), "Context directory should exist");
    assert(exists(`${targetDir}/context.json`), "context.json should exist");

    if (exists(targetDir, true)) {
      Deno.removeSync(targetDir, { recursive: true });
    }
  } finally {
    cleanup(sourceDir);

    try {
      Deno.removeSync(new URL(configPath));
    } catch {
    }
  }
});

Deno.test("installContextFromDisk - should throw when source has no context.json", async () => {
  const invalidDir = `${Deno.env.get("TEMP") ?? "/tmp"}/mcpb-test-no-context-${Date.now()}`;

  Deno.mkdirSync(invalidDir, { recursive: true });

  try {
    const config = createTestConfig(configPath, {});

    await assertReject(async () => {
      await installContextFromDisk(invalidDir, {
        configPath,
        contextModulesPath,
        config,
      });
    });

    try {
      Deno.removeSync(new URL(configPath));
    } catch {
    }
  } finally {
    cleanup(invalidDir);
  }
});

Deno.test("installContextFromDisk - should throw when context.json has no name", async () => {
  const invalidDir = `${Deno.env.get("TEMP") ?? "/tmp"}/mcpb-test-no-name-${Date.now()}`;

  Deno.mkdirSync(`${invalidDir}/tools`, { recursive: true });
  Deno.mkdirSync(`${invalidDir}/resources`, { recursive: true });
  Deno.mkdirSync(`${invalidDir}/prompts`, { recursive: true });
  Deno.writeTextFileSync(`${invalidDir}/context.json`, JSON.stringify({ version: "1.0.0", tags: [] }));

  try {
    const config = createTestConfig(configPath, {});

    await assertReject(async () => {
      await installContextFromDisk(invalidDir, {
        configPath,
        contextModulesPath,
        config,
      });
    });
  } finally {
    cleanup(invalidDir);
  }
});

Deno.test("installContextFromDisk - should not overwrite without force", async () => {
  const testContextName = "test-disk-no-force";
  const sourceDir = makeTempSourceDir(testContextName, "1.0.0");

  try {
    const config = createTestConfig(configPath, {
      [testContextName]: "0.9.0",
    });

    const result = await installContextFromDisk(sourceDir, {
      configPath,
      contextModulesPath,
      config,
      force: false,
    });

    assertEquals(result.hasTypeScriptScripts, false);

    const configReload = loadConfigFile(configPath, { reload: true, create: false });
    const storedImport = configReload.imports[testContextName];

    assertEquals(storedImport, "0.9.0");
  } finally {
    cleanup(sourceDir);

    try {
      Deno.removeSync(new URL(configPath));
    } catch {
    }
  }
});

Deno.test("loadContext - should load context with IImport version parameter (directory format)", async () => {
  createTestConfig(configPath, {});

  try {
    const context = await loadContext(
      "example-context",
      { version: "1.0.0", ref: "github://mcpbay/test", type: "remote" },
      { configPath, doNotDownload: true },
    );

    assertExists(context, "Context should be loaded successfully");
    assertEquals(context.version, "1.0.0");
  } finally {
    try {
      Deno.removeSync(new URL(configPath));
    } catch {
    }
  }
});

Deno.test("loadContext - should load context with simple string version (JSON format)", async () => {
  createTestConfig(configPath, {});

  try {
    const context = await loadContext(
      "git-changelog",
      "1.0.0",
      { configPath, doNotDownload: true },
    );

    assertExists(context, "Context should be loaded successfully");
    assertEquals(context.version, "1.0.0");
    assertEquals(context.tools.length, 1);
    assertEquals(context.tools[0].name, "git_changelog_manager");
  } finally {
    try {
      Deno.removeSync(new URL(configPath));
    } catch {
    }
  }
});

Deno.test("loadContextsFromConfigFile - should handle mixed string and IImport imports", async () => {
  createTestConfig(configPath, {
    "git-changelog": "1.0.0",
    "example-context": { version: "1.0.0", ref: "github://mcpbay/example", type: "remote" } as IImport,
  });

  try {
    const contexts = await loadContextsFromConfigFile(configPath, false);

    assertEquals(contexts.length, 2);

    const gitChangelog = contexts.find((c) => c.tools.length > 0 && c.tools[0].name === "git_changelog_manager")!;
    assertExists(gitChangelog);
    assertEquals(gitChangelog.version, "1.0.0");

    const exampleContext = contexts.find((c) => c.version === "1.0.0" && c.tools.length === 0)!;
    assertExists(exampleContext);
  } finally {
    try {
      Deno.removeSync(new URL(configPath));
    } catch {
    }
  }
});

Deno.test("loadContextsFromConfigFile - should handle string-only imports as before", async () => {
  createTestConfig(configPath, {
    "git-changelog": "1.0.0",
    "project-metadata-manager": "1.0.0",
    "typescript-utilities": "1.0.4",
  });

  try {
    const contexts = await loadContextsFromConfigFile(configPath, false);

    assertEquals(contexts.length, 3);

    const gitChangelog = contexts.find((c) => c.tools.length > 0 && c.tools[0].name === "git_changelog_manager")!;
    assertEquals(gitChangelog.version, "1.0.0");

    const projectMetadata = contexts.find((c) => c.tools.length > 0 && c.tools[0].name === "project_metadata_manager")!;
    assertEquals(projectMetadata.version, "1.0.0");

    const tsUtilities = contexts.find((c) => c.resources.length === 3)!;
    assertEquals(tsUtilities.version, "1.0.4");
  } finally {
    try {
      Deno.removeSync(new URL(configPath));
    } catch {
    }
  }
});

Deno.test("IImport - config serialization and deserialization", async () => {
  const testContextName = "test-import-serialization";
  const sourceDir = makeTempSourceDir(testContextName, "3.0.0");

  try {
    const config = createTestConfig(configPath, {});
    await installContextFromDisk(sourceDir, {
      configPath,
      contextModulesPath,
      config,
      force: true,
    });

    const raw = Deno.readTextFileSync(new URL(configPath));
    const parsed = JSON.parse(raw) as IMcpPackage;
    const storedImport = parsed.imports[testContextName];

    assert(typeof storedImport !== "string", "Import should be stored as object");
    assertEquals(storedImport.version, "3.0.0");
    assertEquals(storedImport.ref, sourceDir);
    assertEquals(storedImport.type, "local");

    const targetDir = `${contextModulesPath}/${testContextName}/3.0.0`;

    if (exists(targetDir, true)) {
      Deno.removeSync(targetDir, { recursive: true });
    }
  } finally {
    cleanup(sourceDir);

    try {
      Deno.removeSync(new URL(configPath));
    } catch {
    }
  }
});

function assertReject(fn: () => Promise<unknown>): Promise<void> {
  return fn().then(
    () => {
      throw new Error("Expected function to throw");
    },
    () => {},
  );
}
