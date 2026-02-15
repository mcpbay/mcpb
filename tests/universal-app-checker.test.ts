import { assertEquals, assertNotEquals } from "@std/assert";
import { UniversalAppChecker } from "../src/classes/universal-app-checker.class.ts";

Deno.test("UniversalAppChecker - Windows Tests", async (t) => {
  // Ensure we are on Windows
  if (Deno.build.os !== "windows") {
    console.log("Skipping Windows tests on non-Windows OS");
    return;
  }

  const checker = new UniversalAppChecker();

  await t.step("getOSType returns 'Windows'", () => {
    assertEquals(checker.getOSType(), "Windows");
  });

  await t.step("checkApp finds existing app (git)", async () => {
    const result = await checker.checkApp("git");
    assertEquals(result.name, "git");
    assertEquals(result.exists, true);
    assertNotEquals(result.path, undefined);
    assertNotEquals(result.path, null);
    // Version should likely be found for git
    assertNotEquals(result.version, undefined);
  });

  await t.step("checkApp finds existing app (node)", async () => {
    const result = await checker.checkApp("node");
    assertEquals(result.name, "node");
    assertEquals(result.exists, true);
    assertNotEquals(result.path, undefined);
  });

  await t.step("checkApp returns false for non-existent app", async () => {
    const appName = "non_existent_app_" + crypto.randomUUID();
    const result = await checker.checkApp(appName);
    assertEquals(result.name, appName);
    assertEquals(result.exists, false);
    assertEquals(result.path, undefined);
    assertEquals(result.version, undefined);
  });

  await t.step("checkMultipleApps handles mixed results", async () => {
    const nonExistent = "non_existent_" + crypto.randomUUID();
    const results = await checker.checkMultipleApps(["git", nonExistent]);
    
    assertEquals(results.length, 2);
    
    const gitResult = results.find(r => r.name === "git");
    const nonExistentResult = results.find(r => r.name === nonExistent);

    assertEquals(gitResult?.exists, true);
    assertEquals(nonExistentResult?.exists, false);
  });
});
