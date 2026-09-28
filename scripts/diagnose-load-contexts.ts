import { loadConfigFile } from "../src/utils/load-config-file.util.ts";
import { loadContext } from "../src/utils/load-context.util.ts";
import { type IImport } from "../src/interfaces/mcp-package.interface.ts";
import { type IContextConfig, type ITSExecuteOptions, MCPContext, isContextProjectFolder } from "@mcpbay/contexts-manager";
import { exists } from "../src/utils/exists.util.ts";
import { writeLog } from "../src/utils/write-log.util.ts";
import { resolvePath } from "../src/utils/resolve-path.util.ts";
import { getDirname } from "../src/utils/get-dirname.util.ts";
import { readJsonFromFile } from "../src/utils/read-json-from-file.util.ts";
import { dirname } from "@std/path";
import { fromFileUrl } from "@std/path";
import { ContextVersion } from "../src/types/context-version.type.ts";

// ─── Configuration ───────────────────────────────────────────────────────────
const WORKSPACE_PATH = Deno.args[0]
  ? (Deno.args[0].startsWith("file://") ? Deno.args[0] : `file:///${Deno.args[0].replace(/\\/g, "/")}`)
  : `file:///E:/Git/profitable`;

const CONFIG_PATH = `${WORKSPACE_PATH}/mcp-config.json`;
const CWD = getDirname(CONFIG_PATH);

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs: number): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const start = performance.now();
  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT after ${formatMs(timeoutMs)}`)), timeoutMs)
      ),
    ]);
    return { ok: true, value: result };
  } catch (err) {
    return { ok: false, error: `${label}: ${(err as Error).message}` };
  } finally {
    const elapsed = performance.now() - start;
    console.log(`  ⏱  ${label}: ${formatMs(elapsed)}`);
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function testLoadConfig() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📋 1. Reading mcp-config.json`);
  console.log(`   Path: ${CONFIG_PATH}`);
  console.log(`${"=".repeat(60)}`);

  const result = await withTimeout(
    (async () => {
      const config = loadConfigFile(CONFIG_PATH, { create: false, reload: true });
      return config;
    })(),
    "loadConfigFile",
    5000,
  );

  if (!result.ok) {
    console.log(`   ❌ FAILED: ${result.error}`);
    return null;
  }

  const config = result.value;
  const entries = Object.entries(config.imports);
  console.log(`   ✅ Found ${entries.length} imports:`);
  for (const [slug, versionOrImport] of entries) {
    const version = typeof versionOrImport === "string" ? versionOrImport : versionOrImport.version;
    const type = typeof versionOrImport === "object" ? versionOrImport.type : "json";
    console.log(`      - ${slug}@${version} (${type})`);
  }

  return { config, entries };
}

async function testJsonContext(slug: string, version: string) {
  const contextJsonPath = `${CWD}/context_modules/${slug}/${version}.json`;
  console.log(`\n  📄 Checking JSON format: ${slug}@${version}`);
  console.log(`     Path: ${contextJsonPath}`);

  if (!exists(contextJsonPath)) {
    console.log(`     ⏭  SKIP: File does not exist`);
    return { format: "json", status: "skip" as const };
  }

  const result = await withTimeout(
    (async () => {
      const contextVersion = readJsonFromFile<ContextVersion>(contextJsonPath);
      return {
        tools: contextVersion.tools.length,
        resources: contextVersion.resources.length,
        prompts: contextVersion.prompts.length,
        name: contextVersion.context.name,
      };
    })(),
    `${slug} JSON parse`,
    5000,
  );

  if (!result.ok) {
    console.log(`     ❌ FAILED: ${result.error}`);
    return { format: "json", status: "fail" as const, error: result.error };
  }

  console.log(`     ✅ OK — ${result.value.name}: ${result.value.tools} tools, ${result.value.resources} resources, ${result.value.prompts} prompts`);
  return { format: "json", status: "ok" as const };
}

async function testDirectoryContext(slug: string, version: string, configPath: string) {
  const contextDirPath = `${CWD}/context_modules/${slug}/${version}`;
  console.log(`\n  📁 Checking directory format: ${slug}@${version}`);
  console.log(`     Path: ${contextDirPath}`);

  if (!exists(contextDirPath, true)) {
    console.log(`     ⏭  SKIP: Directory does not exist`);
    return { format: "dir", status: "skip" as const };
  }

  if (!isContextProjectFolder(contextDirPath)) {
    console.log(`     ⏭  SKIP: Not a valid context project folder`);
    return { format: "dir", status: "skip" as const };
  }

  // Try loading via MCPContext (the real mechanism)
  console.log(`     🔄 Loading via MCPContext.loadContext()...`);

  const result = await withTimeout(
    (async () => {
      const context = new MCPContext();
      const contextJsonPath = `${contextDirPath}/context.json`;
      const config = readJsonFromFile<IContextConfig>(contextJsonPath);
      const timeoutMs = config.deno?.timeout ?? 30000;

      const tsOptions: ITSExecuteOptions = {
        projectCwd: Deno.cwd(),
        importsCwd: contextDirPath,
        extraArguments: config.deno?.extraArguments ?? [],
        timeout: timeoutMs,
        permissions: {
          allowedReadDirs: config.deno?.permissions?.allowedReadDirs ?? [],
          allowedWriteDirs: config.deno?.permissions?.allowedWriteDirs ?? [],
          allowNetDomains: config.deno?.permissions?.allowNetDomains ?? [],
          allowedPackages: config.deno?.permissions?.allowedPackages ?? [],
          allowedExecutables: config.deno?.permissions?.allowedExecutables ?? [],
          allowedEnvironments: config.deno?.permissions?.allowedEnvironments ?? [],
        },
      };

      await context.loadContext(contextDirPath, tsOptions);
      return {
        tools: context.tools.length,
        resources: context.resources.length,
        prompts: context.prompts.length,
        name: config.name,
      };
    })(),
    `${slug} MCPContext.loadContext`,
    120_000, // 2 minutes max for directory contexts
  );

  if (!result.ok) {
    console.log(`     ❌ FAILED: ${result.error}`);
    return { format: "dir", status: "fail" as const, error: result.error };
  }

  console.log(`     ✅ OK — ${result.value.name}: ${result.value.tools} tools, ${result.value.resources} resources, ${result.value.prompts} prompts`);
  return { format: "dir", status: "ok" as const };
}

async function testLoadContextFunction(slug: string, versionOrImport: string | IImport) {
  console.log(`\n  🔄 Testing loadContext("${slug}") (same function used by mcpb_load_contexts tool)...`);

  const result = await withTimeout(
    loadContext(slug, versionOrImport, { configPath: CONFIG_PATH, doNotDownload: true }),
    `${slug} loadContext`,
    120_000,
  );

  if (!result.ok) {
    console.log(`     ❌ FAILED: ${result.error}`);
    return { status: "fail" as const, error: result.error };
  }

  if (!result.value) {
    console.log(`     ⏭  SKIP: loadContext returned undefined (context not found)`);
    return { status: "skip" as const };
  }

  console.log(`     ✅ OK — ${result.value.name}: ${result.value.tools.length} tools, ${result.value.resources.length} resources, ${result.value.prompts.length} prompts`);
  return { status: "ok" as const };
}

async function testEnvironment() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔧 0. Environment Check`);
  console.log(`${"=".repeat(60)}`);

  // Check Deno availability
  try {
    const denoVersion = Deno.version;
    console.log(`   ✅ Deno available: v${denoVersion.deno}`);
  } catch {
    console.log(`   ❌ Deno NOT available`);
  }

  console.log(`   📁 Workspace: ${fromFileUrl(new URL(WORKSPACE_PATH))}`);
  console.log(`   📁 CWD: ${Deno.cwd()}`);

  // Check mcp-config.json exists
  const configPathResolved = resolvePath(CONFIG_PATH);
  console.log(`   📁 Config exists: ${exists(CONFIG_PATH)}`);

  // Check context_modules dir
  const modulesPath = `${CWD}/context_modules`;
  console.log(`   📁 context_modules exists: ${exists(modulesPath, true)}`);

  // List context_modules contents
  if (exists(modulesPath, true)) {
    try {
      const entries: Deno.DirEntry[] = [];
      for await (const entry of Deno.readDir(modulesPath)) {
        entries.push(entry);
      }
      for (const entry of entries) {
        console.log(`      ${entry.isDirectory ? "📁" : "📄"} ${entry.name}`);
        if (entry.isDirectory) {
          const subPath = `${modulesPath}/${entry.name}`;
          for await (const sub of Deno.readDir(subPath)) {
            console.log(`        ${sub.isDirectory ? "📁" : "📄"} ${sub.name}`);
          }
        }
      }
    } catch (e) {
      console.log(`   ❌ Error reading context_modules: ${e}`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`╔${"═".repeat(58)}╗`);
  console.log(`║  MCPBay LoadContextsTool Diagnostic Script              ║`);
  console.log(`║  Tests context loading for a given workspace            ║`);
  console.log(`╚${"═".repeat(58)}╝`);
  console.log(`\nUsage: deno run -A scripts/diagnose-load-contexts.ts [workspace-path]`);
  console.log(`Default: ${WORKSPACE_PATH}`);

  // Step 0: Environment
  await testEnvironment();

  // Step 1: Load config
  const configResult = await testLoadConfig();
  if (!configResult) {
    console.log(`\n❌ Cannot proceed without mcp-config.json`);
    Deno.exit(1);
  }

  const { entries } = configResult;

  // Step 2: Test each context format
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📦 2. Testing each context individually`);
  console.log(`${"=".repeat(60)}`);

  const jsonResults: { slug: string; result: Awaited<ReturnType<typeof testJsonContext>> }[] = [];
  const dirResults: { slug: string; result: Awaited<ReturnType<typeof testDirectoryContext>> }[] = [];
  const loadResults: { slug: string; result: Awaited<ReturnType<typeof testLoadContextFunction>> }[] = [];

  for (const [slug, versionOrImport] of entries) {
    const version = typeof versionOrImport === "string" ? versionOrImport : versionOrImport.version;

    console.log(`\n─── ${slug}@${version} ───────────────────────`);

    // Test format detection
    const jsonResult = await testJsonContext(slug, version);
    jsonResults.push({ slug, result: jsonResult });

    const dirResult = await testDirectoryContext(slug, version, CONFIG_PATH);
    dirResults.push({ slug, result: dirResult });

    // Test the actual loadContext function used by the tool
    const loadResult = await testLoadContextFunction(slug, versionOrImport);
    loadResults.push({ slug, result: loadResult });
  }

  // Step 3: Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 3. SUMMARY`);
  console.log(`${"=".repeat(60)}`);

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const { slug, result } of loadResults) {
    const icon = result.status === "ok" ? "✅" : result.status === "skip" ? "⏭" : "❌";
    const detail = result.status === "fail" ? ` — ${result.error}` : "";
    console.log(`   ${icon} ${slug}${detail}`);
    if (result.status === "ok") passed++;
    else if (result.status === "fail") failed++;
    else skipped++;
  }

  console.log(`\n   ─────────────────────────────`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏭  Skipped: ${skipped}`);
  console.log(`   📦 Total: ${entries.length}`);

  if (failed > 0) {
    console.log(`\n⚠️  DIAGNOSIS TIPS:`);
    console.log(`   • Check if ${resolvePath(CONFIG_PATH)} exists`);
    console.log(`   • Check Deno is in PATH and working`);
    console.log(`   • Check if context_modules/ has all required directories`);
    console.log(`   • For directory contexts: check deno.json and ensure permissions`);
    console.log(`   • Try running: deno check "context_modules/<slug>/<version>/tools/**/*.ts"`);
    Deno.exit(1);
  }

  console.log(`\n✅ All contexts loaded successfully!`);
}

await main();
