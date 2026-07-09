import { assertEquals, assert, assertThrows } from "@std/assert";
import { MdManager } from "../src/classes/md-manager.class.ts";

function makeTempFilePath(): string {
  const dir = `${Deno.env.get("TEMP") ?? "/tmp"}/mcpb-test-md-manager-${Date.now()}`;
  Deno.mkdirSync(dir, { recursive: true });
  return `${dir}/AGENTS.md`;
}

function cleanup(filePath: string) {
  try {
    Deno.removeSync(filePath);
    Deno.removeSync(filePath.substring(0, filePath.lastIndexOf("/")));
  } catch {
  }
}

function hasHeading(content: string, level: number, title: string): boolean {
  const lines = content.split(/\r?\n/);
  const prefix = "#".repeat(level);
  return lines.some((line) => line.trim() === `${prefix} ${title}`);
}

function hasNoHeading(content: string, level: number, title: string): boolean {
  return !hasHeading(content, level, title);
}

Deno.test("MdManager - addSection should shift content headings by 2 levels", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("# Existing Header\n\nSome existing content.\n");

    manager.addSection(
      "My Section",
      "# Original Title\n\nThis is content under the original title.\n\n## Sub Section\n\nMore details here.",
      2,
    );

    const result = manager.readFile();

    assert(hasHeading(result, 2, "My Section"));
    assert(hasHeading(result, 3, "Original Title"));
    assert(hasHeading(result, 4, "Sub Section"));
    assert(result.includes("This is content under the original title."));
    assert(result.includes("More details here."));
    assert(hasNoHeading(result, 1, "Original Title"));
    assert(hasNoHeading(result, 2, "Sub Section"));
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - addSection should cap shifted headings at level 6", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    manager.addSection(
      "Deep Section",
      "##### Level 5\n\nContent.\n\n###### Level 6\n\nMore.",
      2,
    );

    const result = manager.readFile();

    assert(hasHeading(result, 6, "Level 5"));
    assert(hasHeading(result, 6, "Level 6"));
    assert(hasNoHeading(result, 7, "Level 5"));
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - addSection should not modify non-heading lines", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    manager.addSection(
      "Plain Section",
      "Just a paragraph.\n\nAnother paragraph with `# not a heading`.\n\n- List item\n- Another",
      2,
    );

    const result = manager.readFile();

    assert(result.includes("Just a paragraph."));
    assert(result.includes("`# not a heading`"));
    assert(result.includes("- List item"));
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - updateOrCreateSection should create a section with shifted headings", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    manager.updateOrCreateSection(
      "New Section",
      "# Title\n\nBody text.",
    );

    const result = manager.readFile();

    assert(hasHeading(result, 2, "New Section"));
    assert(hasHeading(result, 3, "Title"));
    assert(result.includes("Body text."));
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - updateOrCreateSection should update existing section content with shifted headings", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    manager.updateOrCreateSection(
      "Updatable",
      "# Old Title\n\nOld body.",
    );

    manager.updateOrCreateSection(
      "Updatable",
      "# New Title\n\nNew body.",
    );

    const result = manager.readFile();

    assert(hasHeading(result, 2, "Updatable"));
    assert(hasHeading(result, 3, "New Title"));
    assert(result.includes("New body."));
    assert(hasNoHeading(result, 3, "Old Title"));
    assert(!result.includes("Old body."));
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - updateOrCreateSection should skip update when content is the same", () => {
  const filePath = makeTempFilePath();
  let onSameContentCalled = false;
  let onUpdatedCalled = false;
  let onCreatedCalled = false;

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    manager.updateOrCreateSection(
      "Stable",
      "# Title\n\nSame body.",
      {
        onSameContent: () => { onSameContentCalled = true; },
        onUpdated: () => { onUpdatedCalled = true; },
        onCreated: () => { onCreatedCalled = true; },
      },
    );

    assertEquals(onCreatedCalled, true);
    assertEquals(onSameContentCalled, false);
    assertEquals(onUpdatedCalled, false);

    manager.updateOrCreateSection(
      "Stable",
      "# Title\n\nSame body.",
      {
        onSameContent: () => { onSameContentCalled = true; },
        onUpdated: () => { onUpdatedCalled = true; },
      },
    );

    assertEquals(onSameContentCalled, true);
    assertEquals(onUpdatedCalled, false);
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - replaceSection should replace content with shifted headings", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    manager.addSection("Replaced", "# Initial\n\nInitial body.", 2);
    manager.replaceSection("Replaced", "# Replaced\n\nReplaced body.", 2);

    const result = manager.readFile();

    assert(hasHeading(result, 2, "Replaced"));
    assert(hasHeading(result, 3, "Replaced"));
    assert(result.includes("Replaced body."));
    assert(!result.includes("Initial body."));
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - deleteSection should remove the section entirely", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("# Preamble\n\nPreamble text.\n");
    manager.addSection("ToDelete", "# Deletable\n\nTo be removed.", 2);
    manager.addSection("KeepMe", "# Kept\n\nThis stays.", 2);

    const before = manager.readFile();
    assert(hasHeading(before, 2, "ToDelete"));
    assert(hasHeading(before, 2, "KeepMe"));

    manager.deleteSection("ToDelete");

    const after = manager.readFile();
    assert(hasNoHeading(after, 2, "ToDelete"));
    assert(hasNoHeading(after, 3, "Deletable"));
    assert(!after.includes("To be removed."));
    assert(hasHeading(after, 2, "KeepMe"));
    assert(hasHeading(after, 3, "Kept"));
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - addSection should throw when section already exists", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    manager.addSection("Duplicate", "Content A.", 2);

    assertThrows(() => {
      manager.addSection("Duplicate", "Content B.", 2);
    });
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - deleteSection should throw when section does not exist", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    assertThrows(() => {
      manager.deleteSection("NonExistent");
    });
  } finally {
    cleanup(filePath);
  }
});

Deno.test("MdManager - replaceSection should throw when section does not exist", () => {
  const filePath = makeTempFilePath();

  try {
    const manager = new MdManager(filePath);
    manager.creteIfNotExists("");

    assertThrows(() => {
      manager.replaceSection("Ghost", "Content.");
    });
  } finally {
    cleanup(filePath);
  }
});
