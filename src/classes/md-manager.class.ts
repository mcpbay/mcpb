import { dirname } from "@std/path";
import { resolvePath } from "../utils/resolve-path.util.ts";
import { readTextFile } from "../utils/read-text-file.util.ts";
import { crashIfNot } from "../utils/crash-if-not.util.ts";
import { exists } from "../utils/exists.util.ts";

type MdSection = {
  title: string;
  level: number;
  startLine: number;
  endLine: number;
  content: string;
};

interface IMdUpdateOrCreateSectionOptions {
  /** Heading level for the section, between 1 and 6. */
  level: number;
  /** Callback fired when the section exists and content is unchanged. */
  onSameContent: (section: MdSection) => void;
  /** Callback fired after updating the existing section content. */
  onUpdated: (section: MdSection) => void;
  /** Callback fired after creating a new section. */
  onCreated: (section: MdSection) => void;
}

/**
 * Alex: Wrote with ChatGPT 5.4 codex following MCPBay best practices.
 */
export class MdManager {
  public readonly filePath!: string;
  private content?: string;

  constructor(file: string | URL) {
    const filePath = resolvePath(file);

    this.filePath = filePath;
  }

  readFile() {
    const hasContent = this.content !== undefined;

    if (!hasContent) {
      const fileContent = readTextFile(this.filePath);

      this.content = fileContent;
    }

    const result = this.content as string;

    return result;
  }

  writeFile(content: string) {
    this.content = content;

    Deno.writeTextFileSync(this.filePath, content);
  }

  creteIfNotExists(initialContent = "") {
    const isFileExists = exists(this.filePath, false);

    if (isFileExists) {
      return this;
    }

    const fileDir = dirname(this.filePath);

    try {
      Deno.mkdirSync(fileDir, { recursive: true });
    } catch {
    }

    this.content = initialContent;

    Deno.writeTextFileSync(this.filePath, initialContent);

    return this;
  }

  addSection(title: string, content: string, level = 2) {
    const currentContent = this.readFile();
    const sections = this.getSections(currentContent);
    const isSectionMissing = sections.every((section) =>
      section.title !== title
    );

    crashIfNot(isSectionMissing, `Section \"${title}\" already exists.`);

    const updatedContent = this.appendSection(
      currentContent,
      title,
      content,
      level,
    );

    this.writeFile(updatedContent);

    const result = updatedContent;

    return result;
  }

  updateOrCreateSection(
    title: string,
    content: string,
    options?: Partial<IMdUpdateOrCreateSectionOptions>,
  ) {
    const currentContent = this.readFile();
    const sections = this.getSections(currentContent);
    const existingSection = sections.find((section) => section.title === title);
    const level = options?.level;
    const onSameContent = options?.onSameContent;
    const onUpdated = options?.onUpdated;
    const onCreated = options?.onCreated;

    if (existingSection) {
      const normalizedCurrent = this.normalizeContent(existingSection.content);
      const normalizedNext = this.normalizeContent(content);
      const isSameContent = normalizedCurrent === normalizedNext;

      if (isSameContent) {
        onSameContent?.(existingSection);

        const result = currentContent;

        return result;
      }

      const finalLevel = level ?? existingSection.level;
      const updatedContent = this.replaceSectionContent(
        currentContent,
        existingSection,
        title,
        content,
        finalLevel,
      );

      this.writeFile(updatedContent);
      onUpdated?.(existingSection);

      const result = updatedContent;

      return result;
    }

    const finalLevel = level ?? 2;
    const updatedContent = this.appendSection(
      currentContent,
      title,
      content,
      finalLevel,
    );

    this.writeFile(updatedContent);
    onCreated?.({
      title,
      level: finalLevel,
      startLine: 0,
      endLine: 0,
      content,
    });

    const result = updatedContent;

    return result;
  }

  replaceSection(title: string, content: string, level?: number) {
    const currentContent = this.readFile();
    const section = this.getSectionOrCrash(currentContent, title);
    const finalLevel = level ?? section.level;
    const updatedContent = this.replaceSectionContent(
      currentContent,
      section,
      title,
      content,
      finalLevel,
    );

    this.writeFile(updatedContent);

    const result = updatedContent;

    return result;
  }

  deleteSection(title: string) {
    const currentContent = this.readFile();
    const section = this.getSectionOrCrash(currentContent, title);
    const updatedContent = this.deleteSectionContent(currentContent, section);

    this.writeFile(updatedContent);

    const result = updatedContent;

    return result;
  }

  private appendSection(
    content: string,
    title: string,
    sectionContent: string,
    level: number,
  ) {
    const normalizedContent = this.normalizeContent(content);
    const sectionText = this.buildSectionText(title, sectionContent, level);
    const shouldAddSpacer = normalizedContent.length > 0;
    const spacer = shouldAddSpacer ? "\n\n" : "";
    const combined = `${normalizedContent}${spacer}${sectionText}`;
    const normalizedCombined = this.normalizeOutput(combined);

    const result = normalizedCombined;

    return result;
  }

  private replaceSectionContent(
    content: string,
    section: MdSection,
    title: string,
    sectionContent: string,
    level: number,
  ) {
    const lines = this.getLines(content);
    const newSectionText = this.buildSectionText(title, sectionContent, level);
    const newSectionLines = this.getLines(newSectionText);
    const beforeLines = lines.slice(0, section.startLine);
    const afterLines = lines.slice(section.endLine);
    const updatedLines = beforeLines.concat(newSectionLines, afterLines);
    const updatedContent = updatedLines.join("\n");
    const normalizedContent = this.normalizeOutput(updatedContent);

    const result = normalizedContent;

    return result;
  }

  private deleteSectionContent(content: string, section: MdSection) {
    const lines = this.getLines(content);
    const beforeLines = lines.slice(0, section.startLine);
    const afterLines = lines.slice(section.endLine);
    const updatedLines = beforeLines.concat(afterLines);
    const updatedContent = updatedLines.join("\n");
    const normalizedContent = this.normalizeOutput(updatedContent);

    const result = normalizedContent;

    return result;
  }

  private getSectionOrCrash(content: string, title: string) {
    const sections = this.getSections(content);
    const section = sections.find((item) => item.title === title);

    crashIfNot(section, `Section \"${title}\" not found.`);

    const result = section as MdSection;

    return result;
  }

  private getSections(content: string) {
    const lines = this.getLines(content);
    const headingRegex = /^(#{1,6})\s+(.+?)\s*$/;
    const sections: MdSection[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = line.match(headingRegex);

      if (!match) {
        continue;
      }

      const level = match[1].length;
      const title = match[2];
      const section: MdSection = {
        title,
        level,
        startLine: index,
        endLine: lines.length,
        content: "",
      };

      sections.push(section);
    }

    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index];
      const nextSection = sections[index + 1];
      const endLine = nextSection ? nextSection.startLine : lines.length;
      const contentLines = lines.slice(section.startLine + 1, endLine);
      const sectionContent = contentLines.join("\n");

      section.endLine = endLine;
      section.content = sectionContent;
    }

    const result = sections;

    return result;
  }

  private buildSectionText(title: string, content: string, level: number) {
    const fixedLevel = this.normalizeLevel(level);
    const headingPrefix = "#".repeat(fixedLevel);
    const headingLine = `${headingPrefix} ${title}`;
    const normalizedContent = content.trimEnd();
    const hasContent = normalizedContent.length > 0;
    const sectionText = hasContent
      ? `${headingLine}\n${normalizedContent}`
      : headingLine;

    const result = sectionText;

    return result;
  }

  private normalizeLevel(level: number) {
    const isLevelBelowRange = level < 1;
    const isLevelAboveRange = level > 6;

    crashIfNot(!isLevelBelowRange, "Section level must be >= 1.");
    crashIfNot(!isLevelAboveRange, "Section level must be <= 6.");

    const result = level;

    return result;
  }

  private getLines(content: string) {
    const lines = content.split(/\r?\n/);
    const result = lines;

    return result;
  }

  private normalizeContent(content: string) {
    const normalizedContent = content.trimEnd();
    const result = normalizedContent;

    return result;
  }

  private normalizeOutput(content: string) {
    const normalizedContent = content.trimEnd();
    const shouldAddNewline = normalizedContent.length > 0;
    const output = shouldAddNewline ? `${normalizedContent}\n` : "";
    const result = output;

    return result;
  }
}
