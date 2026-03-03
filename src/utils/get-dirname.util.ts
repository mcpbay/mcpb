import { dirname } from "@std/path";
import { isValidFileURI } from "../validators/is-valid-file-uri.validator.ts";

export function getDirname(path: string) {
  if (isValidFileURI(path)) {
    return dirname(new URL(path));
  }

  return dirname(path);
}