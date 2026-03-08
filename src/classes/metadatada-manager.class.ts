/// <reference lib="deno.unstable" />

import { extname } from "@std/path";
import { fileNameToMime } from "../utils/file-name-to-mime.util.ts";
import { resolvePath } from "../utils/resolve-path.util.ts";
import { readTextFile } from "../utils/read-text-file.util.ts";
import { crashIfNot } from "../utils/crash-if-not.util.ts";

const kv = await Deno.openKv();

export class MetadataManager {
  public readonly filePath!: string;
  public readonly ext!: string;
  public readonly mimeType!: string;
  public readonly content!: string;
  public readonly rawContent!: Uint8Array;

  constructor(file: string | URL) {
    const filePath = resolvePath(file);
    this.mimeType = fileNameToMime(filePath);
    this.ext = extname(filePath);
    this.filePath = filePath;
  }

  readFileAsText() {
    if (this.content === undefined) {
      Object.assign(this, { content: readTextFile(this.filePath) });
    }

    return this.content;
  }

  readFileAsBinary() {
    if (this.rawContent === undefined) {
      Object.assign(this, { rawContent: Deno.readFileSync(this.filePath) });
    }

    return this.rawContent;
  }

  getMetadataId() {
    const isJsTsFile = [".js", ".ts"].includes(this.ext);
    const fileContent = this.readFileAsText();

    if (isJsTsFile) {
      const metadataIdRegex = /\/\* MCPB_METADATA_ID: (.*) \*\/$/;
      const match = fileContent.match(metadataIdRegex);

      return match ? match[1] : null;
    }

    return null;
  }

  async assignMetadataId() {
    const metadataId = crypto.randomUUID();
    const isJsTsFile = [".js", ".ts"].includes(this.ext);
    const fileContent = this.readFileAsText();

    if (isJsTsFile) {
      const updatedContent =
        `${fileContent}\n\n/* MCPB_METADATA_ID: ${metadataId} */`;

      Object.assign(this, { content: updatedContent });
      await Deno.writeTextFile(this.filePath, updatedContent);

      return metadataId as string;
    }

    return null;
  }

  async getOrCreateMetadataId() {
    const metadataId = this.getMetadataId() ?? await this.assignMetadataId();

    crashIfNot(
      metadataId,
      `Unable to find or create metadata id on file: ${this.filePath}`,
    );

    return metadataId;
  }

  async saveMetadata(metadata: Record<string, unknown>) {
    const metadataId = await this.getOrCreateMetadataId();
    const index = ["metadata", metadataId];
    const membersIndex = [...index, "members"];

    const { value: allMembersPrevalue } = await kv.get(membersIndex);

    const allMembers = allMembersPrevalue as string[] | null ??
      [] as string[];

    const metadataKeys = Object.keys(metadata);
    const fixedMembers = Array.from(
      new Set([
        ...allMembers,
        ...metadataKeys,
      ]),
    );

    await kv.set(membersIndex, fixedMembers);

    return metadata;
  }
}
