import { isObject } from "@online/is";

export function deepPatchObject(targetObj: Record<string, unknown>, source: Record<string, unknown>) {
  let result = targetObj;

  for (const key in source) {
    const targetRef = targetObj[key];
    const areDifferentTypes = typeof targetRef !== typeof source[key];

    if (typeof targetRef === "undefined") {
      result[key] = source[key];
    } else if (areDifferentTypes) {
      result[key] = source[key];
    } else if (!areDifferentTypes) {
      if (isObject(source[key])) {
        result[key] = deepPatchObject(targetObj[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}