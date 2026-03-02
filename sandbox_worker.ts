/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import { SandboxAction } from "./src/enums/sandbox-action.enum.ts";
import { SandboxFinishStatus } from "./src/enums/sandbox-finish-status.enum.ts";
import { SandboxNotification } from "./src/enums/sandbox-notification.enum.ts";
import type {
  IExceptionResponse,
  IExecuteCodeActionContext,
  IExecuteCodeResponse,
  IInitializeActionContext,
  IInitializeResponse,
} from "./src/sandboxes/typescript.sandbox.ts";

interface IFunctionExecutionData {
  parameters: string[];
  arguments: any[];
  code: string;
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
          const contextId = await initialize(
            context as IInitializeActionContext,
          );

          return {
            notification: SandboxNotification.INITIALIZED,
            status: SandboxFinishStatus.COMPLETED,
            contextId,
          } satisfies IInitializeResponse;
        }
        case SandboxAction.EXECUTE: {
          const result = await execute(context as IExecuteCodeActionContext);

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
  const { code, context: _context, functionnCall, allowedPackages, cwd } =
    context;
  const fullContext = {
    ...self,
    ..._context,
    internal: {
      cwd,
      fnName: functionnCall?.functionName,
      fnArguments: functionnCall?.args,
    },
    require: (pkg: string) => {
      if (!allowedPackages.includes(pkg)) {
        throw Error(`Package "${pkg}" not allowed.`);
      }

      return import(pkg);
    },
    console: {
      ...console,
      log: (...args: any[]) => {
        self.postMessage({
          notification: SandboxNotification.LOG,
          args,
        });
      },
    },
  };

  const contextKeys = Object.keys(fullContext);
  const contextValues = Object.values(fullContext);
  const eof = (() => {
    if (functionnCall) {
      return `
        if(!Object.keys(exports).includes(internal.fnName)) {
          throw new Error(\`Function "\${internal.fnName}" does not exist\`);
        }

        return exports[internal.fnName](...internal.fnArguments);
      `.trim();
    }

    return "";
  })();

  const contextCode = `
      if (internal.cwd) {
        Deno.chdir(new URL(internal.cwd));
      }

      return (async () => {
        let exports = {};

        ${code}

        ${eof}
      })();
    `.trim();

  cId++;
  contexts.set(
    cId,
    {
      code: contextCode,
      parameters: contextKeys,
      arguments: contextValues,
    } satisfies IFunctionExecutionData,
  );

  return cId;
}

function execute(context: IExecuteCodeActionContext) {
  const { contextId } = context;
  const executionContext = contexts.get(contextId) as
    | IFunctionExecutionData
    | undefined;

  if (!executionContext) {
    throw new Error(`Execution context not found for id ${contextId}.`);
  }

  const fn = new Function(
    ...executionContext.parameters,
    executionContext.code,
  );

  return fn(...executionContext.arguments);
}
