import { MCPBAY_HOST } from "../constants/mcpbay-host.constant.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { loadOrCreateConfigFile } from "./load-or-create-config-file.util.ts";


export async function downloadContext(slug: string): Promise<ContextVersion | null> {
  const config = loadOrCreateConfigFile();
  const API_KEY = Deno.env.get("MCPBAY_API_KEY") ?? "";
  const init: RequestInit = {
    headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : void 0,
    method: "GET",
  };

  const host = config.apiHost ?? MCPBAY_HOST;
  const request = await fetch(`${host}/mcp/download/${slug}`, init);

  if (!request.ok) {
    const response = await request.text();

    if (request.status === 404) {
      console.log("Context not found.");
    }

    return null;
  }

  const response = await request.json();

  return response;
}
