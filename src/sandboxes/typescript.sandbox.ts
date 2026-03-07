import ts, { transpile } from "typescript";
import { SandboxAction } from "../enums/sandbox-action.enum.ts";
import { SandboxNotification } from "../enums/sandbox-notification.enum.ts";
import { SandboxFinishStatus } from "../enums/sandbox-finish-status.enum.ts";
import { writeLog } from "../utils/write-log.util.ts";

function _transpile(typescriptCode: string) {
  return transpile(
    typescriptCode,
    {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      removeComments: false,
      sourceMap: false,
    } satisfies ts.CompilerOptions,
  );
}

export interface IFunctionCallInformation {
  functionName: string;
  args: unknown[];
}

export interface IExecuteOptions {
  allowedPackages: string[];
  context: Record<string, unknown>;
  timeout: number;
  permissions: Deno.PermissionOptions;
  memoryLimitMb: number;
  fn: IFunctionCallInformation;
  cwd: string;
}

export interface IInitializeActionContext {
  contextId: number;
  code: string;
  context: Record<string, unknown>;
  allowedPackages: string[];
  cwd: string;
  functionCall?: IFunctionCallInformation;
}

export interface IExecuteCodeActionContext {
  contextId: number;
}

export interface IInitializeResponse {
  notification: SandboxNotification.INITIALIZED;
  status: SandboxFinishStatus.COMPLETED;
  contextId: number;
}

export interface IExecuteCodeResponse<T = unknown> {
  notification: SandboxNotification.EXECUTION_FINISHED;
  status: SandboxFinishStatus.COMPLETED;
  result: T;
}

export interface IExceptionResponse {
  notification: SandboxNotification.EXECUTION_FINISHED;
  status: SandboxFinishStatus.EXCEPTION;
  error: string;
  cause: unknown;
  stack?: string;
}

export interface ILogNotification {
  notification: SandboxNotification.LOG;
  args: any[];
}

export async function executeTs(
  code: string,
  options: Partial<IExecuteOptions> = {},
): Promise<unknown> {
  const {
    context = {},
    timeout = 10000,
    permissions = {
      net: false,
      read: false,
      env: ["TF_BUILD", "TERM"],
      run: false,
      write: false,
      sys: ["osRelease"],
      import: true,
    },
    memoryLimitMb = 20,
    fn,
    allowedPackages = [],
    cwd = Deno.cwd(),
  } = options;

  // code = _transpile(code);

  const workerUrl = new URL("../../sandbox_worker.ts", import.meta.url).href;
  const resourceLimits: Record<string, number> = {};

  if (memoryLimitMb) {
    resourceLimits.maxOldGenerationSizeMb = memoryLimitMb;
    resourceLimits.maxYoungGenerationSizeMb = Math.floor(memoryLimitMb * 0.3);
  }

  const worker = new Worker(workerUrl, {
    type: "module",
    // @ts-ignore: Deno types are not available.
    deno: {
      permissions,
    },
    // @ts-ignore: Deno types are not available.
    resourceLimits,
  });

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Execution timeout after ${timeout}ms`));
    }, timeout);

    worker.onmessage = (event: MessageEvent) => {
      const message = event.data as
        | IInitializeResponse
        | IExecuteCodeResponse
        | IExceptionResponse
        | ILogNotification;

      switch (message.notification) {
        case SandboxNotification.INITIALIZED:
          worker.postMessage({
            action: SandboxAction.EXECUTE,
            context: {
              contextId: message.contextId,
            } satisfies IExecuteCodeActionContext,
          });
          break;
        case SandboxNotification.EXECUTION_FINISHED:
          clearTimeout(timeoutId);
          worker.terminate();

          if (message.status === SandboxFinishStatus.COMPLETED) {
            return resolve(event.data.result);
          }

          const error = new Error(event.data.error);

          error.stack = event.data.stack;
          error.cause = event.data.cause;

          return reject(error);
        case SandboxNotification.LOG:
          writeLog("[SANDBOX] Log");
          writeLog(message.args);
          break;
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeoutId);
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    worker.postMessage({
      action: SandboxAction.INITIALIZE,
      context: {
        code,
        context,
        functionCall: fn,
        allowedPackages,
        cwd,
        contextId: 0,
      } satisfies IInitializeActionContext,
    });
  });
}
