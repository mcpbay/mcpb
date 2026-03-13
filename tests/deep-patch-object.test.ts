import { assertEquals } from "@std/assert";
import { deepPatchObject } from "../src/utils/deep-patch-object.util.ts";

Deno.test("deepPatchObject should add missing properties from source", () => {
  const targetObj = {
    name: "alpha",
  } as Record<string, unknown>;
  const source = {
    count: 2,
  } as Record<string, unknown>;

  deepPatchObject(targetObj, source);

  const expected = {
    name: "alpha",
    count: 2,
  } as Record<string, unknown>;

  assertEquals(targetObj, expected);
});

Deno.test("deepPatchObject should overwrite when types differ", () => {
  const targetObj = {
    total: 10,
  } as Record<string, unknown>;
  const source = {
    total: "10",
  } as Record<string, unknown>;

  deepPatchObject(targetObj, source);

  const expected = {
    total: "10",
  } as Record<string, unknown>;

  assertEquals(targetObj, expected);
});

Deno.test("deepPatchObject should merge nested objects", () => {
  const targetObj = {
    profile: {
      name: "Alice",
      age: 30,
    },
  } as Record<string, unknown>;
  const source = {
    profile: {
      age: 31,
      city: "Berlin",
    },
  } as Record<string, unknown>;

  deepPatchObject(targetObj, source);

  const expected = {
    profile: {
      name: "Alice",
      age: 31,
      city: "Berlin",
    },
  } as Record<string, unknown>;

  assertEquals(targetObj, expected);
});

Deno.test("deepPatchObject should keep target properties not in source", () => {
  const targetObj = {
    status: "active",
    meta: {
      flags: 2,
    },
  } as Record<string, unknown>;
  const source = {
    meta: {
      flags: 3,
    },
  } as Record<string, unknown>;

  deepPatchObject(targetObj, source);

  const expected = {
    status: "active",
    meta: {
      flags: 3,
    },
  } as Record<string, unknown>;

  assertEquals(targetObj, expected);
});

Deno.test("deepPatchObject should replace nested object with primitive", () => {
  const targetObj = {
    settings: {
      theme: "light",
    },
  } as Record<string, unknown>;
  const source = {
    settings: "dark",
  } as Record<string, unknown>;

  deepPatchObject(targetObj, source);

  const expected = {
    settings: "dark",
  } as Record<string, unknown>;

  assertEquals(targetObj, expected);
});
