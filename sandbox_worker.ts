/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import { SandboxAction } from "./src/enums/sandbox-action.enum.ts";
import { SandboxFinishStatus } from "./src/enums/sandbox-finish-status.enum.ts";
import { SandboxNotification } from "./src/enums/sandbox-notification.enum.ts";
import type {
  IExceptionResponse,
  IExecuteCodeResponse,
  IInitializeActionContext,
  IInitializeResponse,
} from "./src/sandboxes/typescript.sandbox.ts";
import { getInstallationDir } from "./src/utils/get-installation-dir.util.ts";

import ts from "typescript";

function transpile(code: string) {
  return ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

export interface ITransformImports {
  importFunctionName: string;
  mustAwait: boolean;
}

export async function transformImports(
  code: string,
  options?: Partial<ITransformImports>,
): Promise<string> {
  const fn = (options?.mustAwait ? "await " : "") +
    (
      options?.importFunctionName ? options.importFunctionName : "require"
    );

  function destruct(keys: string[], target: string): string {
    // Si no hay keys, retornamos solo el require/import
    if (!keys.length) return `const ${target}`;

    const out: string[] = [];
    while (keys.length) {
      out.push(keys.shift()!.trim().replace(/ as /g, ":"));
    }
    return "const { " + out.join(", ") + " } = " + target;
  }

  function generate(keys: string[], dep: string, base: string): string {
    // Caso especial: import {} from 'module' -> solo ejecuta el import
    if (!base && keys.length === 0) {
      return dep + ";";
    }

    if (keys.length && !base) return destruct(keys, dep);
    return "const " + base + " = " + dep +
      (keys.length ? ";\n" + destruct(keys, base) : "");
  }

  return code.replace(
    /(^|;\s*|\r?\n+)import\s*((?:\*\s*as)?\s*([a-z$_][\w$]*)?\s*,?\s*(?:{([\s\S]*?)})?)?\s*(from)?\s*(['"`][^'"`]+['"`])(?=;?)(?=([^"'`]*["'`][^"'`]*["'`])*[^"'`]*$)/gi,
    (raw, ws, _, base, req, fro, dep) => {
      dep = fn + "(" + dep + ")";

      // Procesar req (los imports dentro de {})
      const keys = req
        ? req.split(",").filter((k: string) => k.trim() !== "")
        : [];

      return (ws || "") + (fro ? generate(keys, dep, base) : dep);
    },
  );
}

/**
 * Alex: Initialized contexts stored here.
 */
const contexts = new Map<number, unknown>();
let cId = 0; // contextId

self.onmessage = async (event: MessageEvent) => {
  const action = event.data.action as SandboxAction;
  const context = event.data.context;

  try {
    const result = await (async () => {
      switch (action) {
        case SandboxAction.INITIALIZE: {
          cId++;
          contexts.set(cId, context);
          context.contextId = cId;

          await initialize(context as IInitializeActionContext);

          return {
            notification: SandboxNotification.INITIALIZED,
            status: SandboxFinishStatus.COMPLETED,
            contextId: cId,
          } satisfies IInitializeResponse;
        }
        case SandboxAction.EXECUTE: {
          const cachedContext = contexts.get(context.contextId);

          if (!cachedContext) {
            throw new Error(
              `Execution context not found for id ${context.contextId}.`,
            );
          }

          const result = await execute(
            cachedContext as IInitializeActionContext,
          );

          return {
            notification: SandboxNotification.EXECUTION_FINISHED,
            status: SandboxFinishStatus.COMPLETED,
            result,
          } satisfies IExecuteCodeResponse;
        }
        default:
          throw new Error("Invalid action.");
      }
    })();

    self.postMessage(result);
  } catch (error) {
    self.postMessage(
      {
        notification: SandboxNotification.EXECUTION_FINISHED,
        status: SandboxFinishStatus.EXCEPTION,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : "No stack available",
        cause: error instanceof Error ? error.cause : "No cause",
      } satisfies IExceptionResponse,
    );
  }
};

async function initialize(context: IInitializeActionContext) {
  const { allowedPackages = [] } = context;

  await Promise.all(
    allowedPackages.map(async (pkg) => {
      try {
        await import(pkg);
      } catch (err) {
        throw new Error(`Failed to preload package "${pkg}": ${err}`);
      }
    }),
  );
}

async function execute(context: IInitializeActionContext) {
  const { contextId, functionCall, code, cwd, allowedPackages = [] } = context;

  const codeWithRemovedImports = await transformImports(code, {
    importFunctionName: "_import",
    mustAwait: true,
  });
  const codeCwd = !!cwd ? `Deno.chdir(new URL("${cwd}"));` : "";

  const preparedCode = `
  ${codeCwd}

  async function importPackage(pkg: string) {
    const allowedPackages = ${JSON.stringify(allowedPackages)};
    if (
      pkg.startsWith('http://')
      || pkg.startsWith('https://')
      || pkg.startsWith('npm:')
      || pkg.startsWith('jsr:')
    ) {
      if(!allowedPackages.includes(pkg)) {
        throw new Error(\`Package not allowed: \${pkg}.\`);
      }

      return await import(pkg);
    }

    return await import(\`npm:\${pkg}\`);
  }

  let _import = importPackage;

  ${codeWithRemovedImports}

  export default function(args: Record<string, unknown>) {
    const { log, functionCall } = args;

    console.log = log;

    if(functionCall) {
      const { functionName, args: functionArgs } = functionCall;

      return globalThis[functionName](...args);
    }    
  }
  `.trim();

  const installationDir = getInstallationDir();
  const tempFile = await Deno.makeTempFile({
    suffix: ".mjs",
    dir: installationDir,
  });

  await Deno.writeTextFile(tempFile, transpile(preparedCode));

  if (cwd) {
    Deno.chdir(new URL(cwd));
  }

  const mod = await import(`file://${tempFile}`);

  const log = (...args: any[]) => {
    self.postMessage({
      notification: SandboxNotification.LOG,
      args,
    });
  };

  return await mod.default({ log, functionCall });
}
