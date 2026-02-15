export interface ISandboxRunOptions {
  /**
   * The network to run the command.
   */
  network: "bridge" | "none" | "host" | "overlay" | "ipvlan" | "macvlan";
  /**
   * The memory the sandbox going to use. In MB. Default: 128.
   */
  memory: number;
  /**
   * The shell to run the command.
   * Default: bash
   */
  shell: "bash" | "sh";
  /**
   * The path of the project to clone inside of the sandbox.
   */
  projectPath: string;
}

export function sandboxRun(command: string, options: Partial<ISandboxRunOptions> = {}) {
  const { network = "none", memory = 128, projectPath = ".", shell = "bash" } = options;
  const cmd = `
  docker run --rm -i \
  --network ${network} \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 128 \
  --memory ${memory}m \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /work \
  -w /work \
  alpine:3.20 \
  sh -c "
    apk add --no-cache git bash nodejs npm >/dev/null 2>&1 &&
    git clone --depth 1 https://repo.git . &&
    timeout 30s bash -lc '${command}'
  "
  `.trim();
}