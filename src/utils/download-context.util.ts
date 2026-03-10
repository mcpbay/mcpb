import { ContextVersion } from "../types/context-version.type.ts";

export async function downloadContext(
  slug: string,
): Promise<ContextVersion | null> {
  const API_KEY = Deno.env.get("MCPBAY_API_KEY") ?? "";
  const init: RequestInit = {
    headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : void 0,
    method: "GET",
  };

  const host = Deno.env.get("API_HOST") ?? "https://papi.mcpbay.io/v1";
  const request = await fetch(`${host}/mcp/download/${slug}`, init);

  if (!request.ok) {
    const response = await request.text();

    if (request.status === 404) {
      console.log("Context not found.");
    } else {
      console.log(`Unexpected API response`);
      console.log(`  host: ${host}`);
      console.log(`  status: ${request.status}`);
      console.log(`  response:`);
      console.log("");
      console.log(response.trim());
      console.log("");
    }

    return null;
  }

  const response = await request.json();

  return response;
}
