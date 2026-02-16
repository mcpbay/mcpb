import { ImageExtension } from "../enums/image-extension.enum.ts";

export function isImageExtension(extension: string) {
  return Object.values(ImageExtension).includes(extension as ImageExtension);
}
