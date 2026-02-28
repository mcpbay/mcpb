import ts, { transpile } from "typescript";

function _transpile(typescriptCode: string) {
  return transpile(
    typescriptCode,
    {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ESNext,
      removeComments: false,
      sourceMap: false,
    } satisfies ts.CompilerOptions
  );
}

export interface ExecuteOptions {
  context?: Record<string, unknown>;
  timeout?: number;
  permissions?: Deno.PermissionOptions;
  memoryLimitMb?: number;
  fn?: {
    functionName: string;
    args: unknown[];
  };
}

export async function executeTs(
  code: string,
  options: ExecuteOptions = {}
): Promise<unknown> {
  const {
    context = {},
    timeout = 5000,
    permissions = {
      net: false,
      read: false,
      env: ["TF_BUILD", "TERM"],
      run: false,
      write: false,
      sys: ["osRelease"],
      import: true
    },
    memoryLimitMb = 20,
    fn
  } = options;

  code = _transpile(code);
  const workerUrl = new URL('./sandbox_worker.ts', import.meta.url).href;
  const resourceLimits: Record<string, number> = {};

  if (memoryLimitMb) {
    resourceLimits.maxOldGenerationSizeMb = memoryLimitMb;
    resourceLimits.maxYoungGenerationSizeMb = Math.floor(memoryLimitMb * 0.3);
  }

  const worker = new Worker(workerUrl, {
    type: "module",
    // @ts-ignore: Deno types are not available.
    deno: {
      permissions
    },
    // @ts-ignore: Deno types are not available.
    resourceLimits
  });

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Execution timeout after ${timeout}ms`));
    }, timeout);

    worker.onmessage = (event: MessageEvent) => {
      clearTimeout(timeoutId);
      worker.terminate();

      if ("error" in event.data) {
        return reject(new Error(event.data.error));
      }

      resolve(event.data);
    };

    worker.onerror = (error) => {
      clearTimeout(timeoutId);
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    worker.postMessage({ code, context, isCallFunctionMode: !!fn, fnCallContent: fn });
  });
}