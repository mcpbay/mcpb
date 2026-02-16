interface AppInfo {
  name: string;
  exists: boolean;
  path?: string;
  version?: string;
  installationMethod?: string;
}

export class UniversalAppChecker {
  private os: typeof Deno.build.os;

  constructor() {
    this.os = Deno.build.os;
  }

  private async getPathWindows(app: string): Promise<string | null> {
    try {
      const whereCmd = new Deno.Command("where", {
        args: [app],
        stdout: "piped",
        stderr: "null",
      });
      const { success, stdout } = await whereCmd.output();
      if (success) {
        return new TextDecoder().decode(stdout).trim().split("\n")[0];
      }
    } catch {
    }

    const extensions = [".exe", ".bat", ".cmd", ".ps1"];
    for (const ext of extensions) {
      try {
        const whereExtCmd = new Deno.Command("where", {
          args: [`${app}${ext}`],
          stdout: "piped",
          stderr: "null",
        });
        const { success, stdout } = await whereExtCmd.output();
        if (success) {
          return new TextDecoder().decode(stdout).trim().split("\n")[0];
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private async getPathMacOS(app: string): Promise<string | null> {
    try {
      const whichCmd = new Deno.Command("which", {
        args: [app],
        stdout: "piped",
        stderr: "null",
      });
      const { success, stdout } = await whichCmd.output();
      if (success) {
        const path = new TextDecoder().decode(stdout).trim();
        return path || null;
      }
    } catch {
    }

    try {
      const commandCmd = new Deno.Command("sh", {
        args: ["-c", `command -v ${app}`],
        stdout: "piped",
        stderr: "null",
      });
      const { success, stdout } = await commandCmd.output();
      if (success) {
        const path = new TextDecoder().decode(stdout).trim();
        if (path) return path;
      }
    } catch {
    }

    const macPaths = [
      `/usr/local/bin/${app}`,
      `/opt/homebrew/bin/${app}`, // Homebrew en Apple Silicon
      `/usr/local/opt/${app}/bin/${app}`, // Enlaces de Homebrew
      `/opt/local/bin/${app}`, // MacPorts
      `/usr/bin/${app}`,
      `/bin/${app}`,
      `/Applications/${app}/Contents/MacOS/${app}`, // Apps GUI
      `/Applications/${this.capitalize(app)}.app/Contents/MacOS/${app}`,
    ];

    if (this.os === "darwin") {
      macPaths.push(`/usr/local/Homebrew/bin/${app}`);
    }

    for (const path of macPaths) {
      try {
        await Deno.stat(path);
        return path;
      } catch {
        continue;
      }
    }

    return null;
  }

  private async getPathLinux(app: string): Promise<string | null> {
    try {
      const whichCmd = new Deno.Command("which", {
        args: [app],
        stdout: "piped",
        stderr: "null",
      });
      const { success, stdout } = await whichCmd.output();
      if (success) {
        const path = new TextDecoder().decode(stdout).trim();
        if (path) return path;
      }
    } catch {
    }

    try {
      const commandCmd = new Deno.Command("sh", {
        args: ["-c", `command -v ${app}`],
        stdout: "piped",
        stderr: "null",
      });
      const { success, stdout } = await commandCmd.output();
      if (success) {
        const path = new TextDecoder().decode(stdout).trim();
        if (path) return path;
      }
    } catch {
      // Ignorar error
    }

    // Método 3: whereis
    try {
      const whereisCmd = new Deno.Command("whereis", {
        args: [app],
        stdout: "piped",
        stderr: "null",
      });
      const { success, stdout } = await whereisCmd.output();
      if (success) {
        const output = new TextDecoder().decode(stdout).trim();
        const paths = output.split(" ");
        if (paths.length > 1) return paths[1];
      }
    } catch {
    }

    return null;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private detectMacInstallMethod(path: string): string {
    if (path.includes("homebrew") || path.includes("brew")) {
      return "Homebrew";
    } else if (path.includes("macports")) {
      return "MacPorts";
    } else if (path.includes("Applications")) {
      return "Application Bundle";
    } else {
      return "System";
    }
  }

  async getAppPath(app: string): Promise<string | null> {
    switch (this.os) {
      case "windows":
        return await this.getPathWindows(app);
      case "darwin":
        return await this.getPathMacOS(app);
      default: // linux
        return await this.getPathLinux(app);
    }
  }

  async getAppVersion(app: string, path?: string): Promise<string | undefined> {
    const versionFlags = ["--version", "-v", "-V", "version"];

    for (const flag of versionFlags) {
      try {
        const versionCmd = new Deno.Command(app, {
          args: [flag],
          stdout: "piped",
          stderr: "piped",
        });

        const { success, stdout } = await versionCmd.output();
        if (success) {
          const version = new TextDecoder().decode(stdout).trim();
          if (version) return version.split("\n")[0];
        }
      } catch {
        continue;
      }
    }

    if (this.os === "darwin" && path?.includes(".app/")) {
      try {
        const plistPath = path.substring(0, path.indexOf(".app/") + 4) +
          "/Contents/Info.plist";
        const plistCmd = new Deno.Command("defaults", {
          args: ["read", plistPath, "CFBundleShortVersionString"],
          stdout: "piped",
          stderr: "piped",
        });
        const { success, stdout } = await plistCmd.output();
        if (success) {
          return new TextDecoder().decode(stdout).trim();
        }
      } catch {
      }
    }

    return undefined;
  }

  async checkApp(app: string): Promise<AppInfo> {
    const path = await this.getAppPath(app);
    const exists = path !== null;

    let version: string | undefined;
    let installationMethod: string | undefined;

    if (exists) {
      version = await this.getAppVersion(app, path);

      if (this.os === "darwin" && path) {
        installationMethod = this.detectMacInstallMethod(path);
      }
    }

    return {
      name: app,
      exists,
      path: path || undefined,
      version,
      installationMethod,
    };
  }

  async checkMultipleApps(apps: string[]): Promise<AppInfo[]> {
    const results: AppInfo[] = [];

    for (const app of apps) {
      const result = await this.checkApp(app);
      results.push(result);

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return results;
  }

  getOSType(): string {
    switch (this.os) {
      case "windows":
        return "Windows";
      case "darwin":
        return "macOS";
      case "linux":
        return "Linux";
      default:
        return this.os;
    }
  }
}
