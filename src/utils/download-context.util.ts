import { MCPBAY_HOST } from "../constants/mcpbay-host.constant.ts";
import { ContextVersion } from "../types/context-version.type.ts";
import { crashIfNot } from "./crash-if-not.util.ts";

const API_KEY = Deno.env.get('MCPBAY_API_KEY');

export async function downloadContext(slug: string): Promise<ContextVersion> {
  const init: RequestInit = {
    headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : void 0,
    method: "GET",
  };

  const request = await fetch(`${MCPBAY_HOST}/mcp/download/${slug}`, init);

  if (!request.ok) {
    const response = await request.text();

    crashIfNot(false, `Failed to download context (${request.status}): ${response}`);
  }

  const response = await request.json();

  return response;
}