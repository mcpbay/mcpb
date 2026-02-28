/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

self.onmessage = async (event: MessageEvent) => {
  const { code, context, isCallFunctionMode, fnCallContent } = event.data;

  try {
    const fullContext = {
      ...self,
      ...context,
      fnName: fnCallContent?.functionName,
      fnArguments: fnCallContent?.args,
      require: (i: string) => import(i)
    };

    // Ejecutar el código
    const contextKeys = Object.keys(fullContext);
    const contextValues = Object.values(fullContext);
    const eof = (() => {
      if (isCallFunctionMode) {
        return `
        if(!Object.keys(exports).includes(fnName)) {
          throw new Error(\`Function "\${fnName}" does not exist\`);
        }

        return exports[fnName](...fnArguments);
      `.trim();
      }

      return "";
    })();

    const _code = `
      return (async () => {
        let exports = {};

        ${code}

        ${eof}
      })();
    `.trim();

    const fn = new Function(...contextKeys, _code);
    const result = await fn(...contextValues);
    
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};