export enum OSType {
  WINDOWS = "windows",
  MACOS = "darwin",
  LINUX = "linux",
  ANDROID = "linux",
  UNKNOWN = "unknown",
}

export enum ArchitectureType {
  ARM = "aarch64",
  INTEL = "x86_64",
}

function closeString(value: string, values: string[], defaultValue: string) {
  for (const v of values) {
    if (value.toLowerCase().includes(v.toLowerCase())) {
      return v;
    }
  }
  return defaultValue;
}

export function getOs(): [OSType, ArchitectureType] {
  const os = Deno.build.os;
  const arch = Deno.build.arch;

  return [
    closeString(os, Object.values(OSType), OSType.UNKNOWN) as OSType,
    arch as ArchitectureType,
  ];
}
