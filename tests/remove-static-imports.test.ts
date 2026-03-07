
import { assertEquals } from "@std/assert";
import { removeStaticImports } from "../src/utils/remove-static-imports.util.ts";

Deno.test("removeStaticImports should remove a single static import", () => {
  const code = 'import { foo } from "./bar";\nconsole.log("hello");';
  const expected = 'console.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should remove multiple static imports", () => {
  const code = 'import { foo } from "./bar";\nimport { baz } from "./qux";\nconsole.log("hello");';
  const expected = 'console.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should not remove dynamic imports", () => {
  const code = 'const foo = import("./bar");\nconsole.log("hello");';
  const expected = 'const foo = import("./bar");\nconsole.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should not remove imports within strings", () => {
  const code = 'const str = "import { foo } from \"./bar\"";\nconsole.log("hello");';
  const expected = 'const str = "import { foo } from \"./bar\"";\nconsole.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle mixed content", () => {
  const code = 'console.log("start");\nimport { foo } from "./bar";\nconst x = 1;\nimport "some-side-effect";\nconsole.log("end");';
  const expected = 'console.log("start");\n\nconst x = 1;\n\nconsole.log("end");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle no static imports", () => {
  const code = 'console.log("hello");\nconst x = 1;';
  const expected = 'console.log("hello");\nconst x = 1;';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle different import syntaxes", () => {
  const code = 'import * as foo from "./bar";\nimport { baz, qux } from "./qux";\nimport "side-effects";\nconsole.log("done");';
  const expected = 'console.log("done");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with comments", () => {
  const code = '// some comment\nimport { foo } from "./bar"; // inline comment\n/* block comment */\nimport { baz } from "./qux";\nconsole.log("done");';
  const expected = '// some comment\n // inline comment\n/* block comment */\n\nconsole.log("done");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports followed by a newline instead of a semicolon", () => {
  const code = 'import { foo } from "./bar"\nconsole.log("hello");';
  const expected = 'console.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports at the end of the file", () => {
  const code = 'console.log("hello");\nimport { foo } from "./bar";';
  const expected = 'console.log("hello");\n';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should remove a single static import without semicolon", () => {
  const code = 'import { foo } from "./bar"\nconsole.log("hello")';
  const expected = 'console.log("hello")';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should remove multiple static imports without semicolons", () => {
  const code = 'import { foo } from "./bar"\nimport { baz } from "./qux"\nconsole.log("hello")';
  const expected = 'console.log("hello")';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with different indentation", () => {
  const code = '  import { foo } from "./bar";\n    import { baz } from "./qux";\nconsole.log("hello");';
  const expected = 'console.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with leading/trailing whitespace", () => {
  const code = ' import { foo } from "./bar" ; \nconsole.log("hello");';
  const expected = 'console.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle empty input", () => {
  const code = '';
  const expected = '';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle code with only imports", () => {
  const code = 'import { foo } from "./bar";\nimport "side-effects";';
  const expected = '';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with multiline comments", () => {
  const code = '/*\n * Multi-line comment\n */\nimport { foo } from "./bar";\nconsole.log("done");';
  const expected = '/*\n * Multi-line comment\n */\n\nconsole.log("done");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with mixed quotes", () => {
  const code = `import { foo } from './bar';\nimport { baz } from "./qux";\nconsole.log("done");`;
  const expected = 'console.log("done");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with aliases", () => {
  const code = 'import { foo as myFoo } from "./bar";\nconsole.log(myFoo);';
  const expected = 'console.log(myFoo);';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle default imports", () => {
  const code = 'import MyDefault from "./bar";\nconsole.log(MyDefault);';
  const expected = 'console.log(MyDefault);';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle namespace imports", () => {
  const code = 'import * as MyModule from "./bar";\nconsole.log(MyModule);';
  const expected = 'console.log(MyModule);';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle side-effect imports with newlines", () => {
  const code = 'import "some-side-effect"\nconsole.log("done");';
  const expected = 'console.log("done");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle multiple import types in one line (not common but for robustness)", () => {
  const code = 'import { a } from "./a"; import { b } from "./b"; console.log("test");';
  const expected = ' console.log("test");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle comments before and after imports", () => {
  const code = '// Before import\nimport { foo } from "./bar"; // After import\nconsole.log("hello");';
  const expected = '// Before import\n // After import\nconsole.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with no spaces", () => {
  const code = 'import{foo}from"./bar";console.log("hello");';
  const expected = 'console.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with different line endings (CRLF)", () => {
  const code = 'import { foo } from "./bar";\r\nconsole.log("hello");';
  const expected = 'console.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});

Deno.test("removeStaticImports should handle imports with different line endings (LF)", () => {
  const code = 'import { foo } from "./bar";\nconsole.log("hello");';
  const expected = 'console.log("hello");';
  assertEquals(removeStaticImports(code).trim(), expected.trim());
});
