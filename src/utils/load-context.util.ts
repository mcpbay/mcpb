import { addCommand } from "../commands/add.command.ts";
import { CONTEXT_MODULES_PATH } from "../constants/context-modules-path.constant.ts";
import { existsSync } from "@std/fs";
import { ContextVersion } from "../types/context-version.type.ts";

export async function loadContext(context: string, version: string, contextModulesPath = CONTEXT_MODULES_PATH) {
  const contextPath = `${contextModulesPath}/${context}/${version}.json`;

  if (!existsSync(contextPath)) {
    await addCommand(`${context}@${version}`);
  }

  const contextJson = Deno.readTextFileSync(contextPath);
  const contextObject = JSON.parse(contextJson);

  return contextObject as ContextVersion;
}