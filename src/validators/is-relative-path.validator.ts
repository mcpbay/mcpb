import { getDirname } from "../utils/get-dirname.util.ts";
import { isValidFileURI } from "./is-valid-file-uri.validator.ts";

export function isRelativePath(path: string) {
  if (isValidFileURI(path)) {
    const fileUrl = new URL(path);

    return fileUrl.pathname.startsWith("/");
  }

  const baseName = getDirname(path);

  return baseName === "/" || baseName === "./";
}