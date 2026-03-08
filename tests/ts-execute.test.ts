import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { tsExecute } from "../src/utils/ts-execute.util.ts";

Deno.test("tsExecute", async (test) => {
  await test.step("should execute basic TypeScript code", async () => {
    const code = 'console.log("Hello, Deno!");';
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: false,
        allowNet: [],
        allowedPackages: [],
      },
      timeout: 5000,
    };

    const { outMessage } = await tsExecute(code, options);

    assertEquals(outMessage.trim(), "Hello, Deno!");
  });

  await test.step("should handle read permissions", async () => {
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: false,
        allowNet: [],
        allowedPackages: [],
      },
      timeout: 5000,
    };

    // Create a temporary file for testing read permissions
    const tempFilePath = await Deno.makeTempFile({ suffix: ".txt" });
    await Deno.writeTextFile(tempFilePath, "test content");

    const code = `Deno.readTextFileSync("${
      tempFilePath.replaceAll("\\", "/")
    }");`;

    await assertRejects(
      async () => {
        await tsExecute(code, options);
      },
      Error,
      "NotCapable: Requires read access to",
    );

    await Deno.remove(tempFilePath);
  });

  await test.step("should handle write permissions", async () => {
    const code = 'Deno.writeTextFileSync("output.txt", "output content");';
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: true,
        allowNet: [],
        allowedPackages: [],
      },
      timeout: 5000,
    };

    const { outMessage } = await tsExecute(code, options);

    // Clean up the created file
    try {
      await Deno.remove("output.txt");
    } catch (error) {
      // Ignore if file doesn't exist
    }

    assertEquals(outMessage, "");
  });

  await test.step("should handle net permissions", async () => {
    const code = 'await fetch("http://example.com");';
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: false,
        allowNet: ["example.com"],
        allowedPackages: [],
      },
      timeout: 5000,
    };

    const { outMessage } = await tsExecute(code, options);

    assertEquals(outMessage, "");
  });

  await test.step("should invoke a function with arguments", async () => {
    const code = "function add(a, b) { console.log(a + b); }";
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: false,
        allowNet: [],
        allowedPackages: [],
      },
      timeout: 5000,
      invoke: {
        function: "add",
        arguments: [1, 2],
      },
    };

    const { outMessage } = await tsExecute(code, options);

    assertEquals(outMessage.trim(), "3");
  });

  await test.step("should return the stringified response of the invoked function", async () => {
    const code =
      "function greet(name) { return { message: `Hello, ${name}!` }; }";
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: false,
        allowNet: [],
        allowedPackages: [],
      },
      timeout: 5000,
      invoke: {
        function: "greet",
        arguments: ["Deno"],
      },
    };

    const { outMessage } = await tsExecute(code, options);

    assertEquals(
      outMessage.trim(),
      JSON.stringify({ message: "Hello, Deno!" }),
    );
  });

  // await test.step("should handle timeout", async () => {
  //   const code = 'await new Promise((resolve) => setTimeout(resolve, 1000));';
  //   const options = {
  //     cwd: Deno.cwd(),
  //     permissions: {
  //       allowRead: false,
  //       allowWrite: false,
  //       allowNet: [],
  //       allowedPackages: [],
  //     },
  //     timeout: 100,
  //   };

  //   await assertRejects(
  //     async () => {
  //       await tsExecute(code, options);
  //     },
  //     Error,
  //     "Timeout",
  //   );
  // });

  await test.step("should allow permitted package imports", async () => {
    const code =
      'const { assert } = await import("jsr:@std/assert"); assert(true); console.log("Import successful");';
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: false,
        allowNet: [],
        allowedPackages: ["jsr:@std/assert"],
      },
      timeout: 5000,
    };

    const { outMessage } = await tsExecute(code, options);

    assertEquals(outMessage.trim(), "Import successful");
  });

  await test.step("should disallow non-permitted package imports", async () => {
    const code =
      'const { assert } = import("jsr:@std/assert"); assert(true); console.log("Import successful");';
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: false,
        allowNet: [],
        allowedPackages: [],
      },
      timeout: 5000,
    };

    await assertRejects(
      async () => {
        await tsExecute(code, options);
      },
      Error,
      'Invalid package import: "jsr:@std/assert".',
    );
  });

  await test.step("should catch errors in the executed code", async () => {
    const code = 'throw new Error("Test error");';
    const options = {
      cwd: Deno.cwd(),
      permissions: {
        allowRead: false,
        allowWrite: false,
        allowNet: [],
        allowedPackages: [],
      },
      timeout: 5000,
    };

    await assertRejects(
      async () => {
        await tsExecute(code, options);
      },
      Error,
      "Test error",
    );
  });
});
