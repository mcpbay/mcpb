export function tempFile(content: string) {
  const tempFilePath = Deno.makeTempFileSync();

  Deno.writeTextFileSync(tempFilePath, content);

  return tempFilePath;
}
