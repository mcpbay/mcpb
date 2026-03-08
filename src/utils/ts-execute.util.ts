import { dirname } from "@std/path";
import { removeStaticImports } from "./remove-static-imports.util.ts";
import { tempFile } from "./temp-file.util.ts";

export interface ITSExecuteOptions {
  cwd: URL | string;
  permissions: {
    allowRead: boolean;
    allowWrite: boolean;
    allowNet: string[];
    allowedPackages: string[];
  };
  timeout: number;
  invoke?: {
    function: string;
    arguments: unknown[];
  };
}

export async function tsExecute(code: string, options: ITSExecuteOptions) {
  const { permissions, timeout, invoke } = options;
  const args: string[] = ["run"];

  code = removeStaticImports(code);
  code = code.replaceAll("import(", "_mcpb_import(");

  const mcpbImport = `
const allowedPackages: string[] = ${JSON.stringify(options.permissions.allowedPackages)};

function _mcpb_import(_packageName: string) {
  if (!allowedPackages.includes(_packageName)) {
    throw new Error(\`Invalid package import: "\${_packageName}".\`);
  }

  return import(_packageName);
}
  `.trim();

  code = `${mcpbImport}\n\n${code}`;

  if (invoke) {
    code += `
const _mcpb_result = await ${invoke.function}(...${JSON.stringify(invoke.arguments)});

//if (typeof _mcpb_result !== "object") {
//  throw new Error("Invalid function result, object expected.");
//}

if(_mcpb_result !== undefined) {
  console.log(JSON.stringify(_mcpb_result));
}`;
  }

  const codeFilePath = tempFile(code);
  const tempDir = dirname(codeFilePath);

  if (permissions.allowRead) {
    args.push(`--allow-read=./,${tempDir}`);
  }

  if (permissions.allowWrite) {
    args.push(`--allow-write=./,${tempDir}`);
  }

  if (permissions.allowNet.length) {
    args.push(`--allow-net=${permissions.allowNet.join(",")}`);
  }

  args.push(`--allow-env=TMPDIR,TMP,TEMP`);
  args.push(codeFilePath);

  const command = new Deno.Command("deno", {
    args,
    cwd: options.cwd,
    // signal: AbortSignal.timeout(timeout),
    stdin: "null",
    stderr: "piped",
    stdout: "piped"
  });

  const decoder = new TextDecoder();
  const child = command.spawn();

  const timeoutId = setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch { }
  }, timeout);

  const { success, stderr, stdout } = await child.output();

  clearTimeout(timeoutId);

  if (!success) {
    Deno.removeSync(codeFilePath);
    const errorMessage = decoder.decode(stderr);
    throw new Error(errorMessage);
  }

  const outMessage = decoder.decode(stdout).trim();

  return { outMessage, codeFilePath };
}
