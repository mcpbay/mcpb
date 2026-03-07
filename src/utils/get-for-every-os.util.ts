import { getOs, OSType } from "./get-os.util.ts";


export function getForEveryOS<T>(results: Record<OSType, T>) {
  const [os] = getOs();
  return results[os];
}