import { EasyMCPServer } from "@mcpbay/easy-mcp-server";
import { StdioTransport } from "@mcpbay/easy-mcp-server/transports";
import { INVALID_PARAMS } from "@mcpbay/easy-mcp-server/constants";
import { crashIfNot } from "@mcpbay/easy-mcp-server/utils";
import {
  IContextModel,
  IContextModelOptions,
  IPrompt,
  IServerClientInformation,
  IResourcesListResponse,
  IResource,
  IResourceContent
} from "@mcpbay/easy-mcp-server/types";
import { assert } from "@std/assert";
import { Catalog, Resource } from "../mcpbay-types.ts";

const ACCESS_KEY = Deno.env.get("ACCESS_KEY");
const CATALOG_SLUG = Deno.env.get("CATALOG_SLUG");
const MCPBAY_HOST = Deno.env.get("MCPBAY_HOST");

assert(ACCESS_KEY, "ACCESS_KEY env is required");
assert(CATALOG_SLUG, "CATALOG_ID env is required");
assert(MCPBAY_HOST, "MCPBAY_HOST env is required");

function writeLog(message: string) {
  Deno.writeFileSync("log.txt", new TextEncoder().encode(message + "\n"), {
    append: true
  });
}

function clearLogs() {
  Deno.removeSync("log.txt");
}

clearLogs();
type LocalResource = IResource & { id: string; };

class Context implements IContextModel {
  private serverInformation!: IServerClientInformation;
  private prompts: IPrompt[] = [];
  private resources: LocalResource[] = [];

  constructor() {
    writeLog("constructor...");
  }

  async request<T>(
    path: string | string[],
    type: "GET" | "POST",
    body: Record<string, unknown>,
    abortController?: AbortController
  ) {
    const query = type === "GET"
      ? new URLSearchParams(body as Record<string, string>).toString()
      : "";

    const updatedPath = path instanceof Array ? path.map(String).join('/') : path;
    const url = `${MCPBAY_HOST}/mcp/${updatedPath}?${query}`;
    const request = await fetch(url, {
      method: type,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_KEY}`,
      },
      body: type === "POST" ? JSON.stringify(body) : void 0,
      signal: abortController?.signal ?? AbortSignal.timeout(1000 * 10)
    });

    if (!request.ok) {
      writeLog(`request failed tp '${url}': ${request.status} ${request.statusText}`);
      crashIfNot(false, {
        message: await request.text(),
        code: -32602
      });
    }

    return request.json() as T;
  }

  async onInitialize() {
    writeLog("initialize...");
    const catalog = await this.request<Catalog>(
      "information",
      "GET",
      { catalogSlug: CATALOG_SLUG },
    );

    writeLog(`catalog ` + JSON.stringify(catalog));

    this.serverInformation = {
      name: catalog.name,
      version: "1.0.0",
    };

    writeLog(`serverInfo ` + JSON.stringify(this.serverInformation));
  }

  async onClientListInformation(
    _options: IContextModelOptions,
  ): Promise<IServerClientInformation> {
    writeLog(`onClientListInformation`);
    return this.serverInformation;
  }

  async onClientListPrompts(options: IContextModelOptions) {
    writeLog(`onClientListPrompts`);
    const prompts = await this.request<IPrompt[]>(
      "prompts",
      "GET",
      { catalogSlug: CATALOG_SLUG },
      options.abortController
    );

    writeLog('prompts ' + JSON.stringify(prompts));

    return prompts;
  }

  async onClientListResources(options: IContextModelOptions): Promise<IResourcesListResponse["result"]["resources"]> {
    writeLog(`onClientListResources`);
    const remoteResources = await this.request<Resource[]>(
      "resources",
      "GET",
      { catalogSlug: CATALOG_SLUG },
      options.abortController
    );

    writeLog('remoteResources ' + JSON.stringify(remoteResources));
    const resources: LocalResource[] = remoteResources.map((remoteResource) => {
      return {
        id: remoteResource.id,
        uri: remoteResource.uri,
        name: remoteResource.name,
        mimeType: remoteResource.mimeType,
        size: remoteResource.size,
        description: remoteResource.description,
        title: remoteResource.title
      } as LocalResource;
    });
    writeLog('resources ' + JSON.stringify(resources));

    this.resources = resources;

    return resources;
  }

  async onClientReadResource(resourceUri: string, options: IContextModelOptions): Promise<IResourceContent[]> {
    writeLog(`onClientReadResource ${resourceUri}`);
    const cachedResource = this.resources.find((resource) => resource.uri === resourceUri);

    crashIfNot(cachedResource, {
      message: "Resource not found.",
      code: INVALID_PARAMS
    });

    const resource = await this.request<Resource>(
      ["resources", cachedResource.id],
      "GET",
      { catalogSlug: CATALOG_SLUG },
      options.abortController
    );

    const resourceContent = [{ mimeType: resource.mimeType, blob: resource.blob ?? undefined, text: resource.text ?? undefined, uri: resource.uri }] as IResourceContent[];

    writeLog('resourceContent ' + JSON.stringify(resourceContent));
    return resourceContent;
  }
}

const context = new Context();
const server = new EasyMCPServer(new StdioTransport(), context, {
  server: {
    sendPromptsListChangedNotification: true,
  }
});

server.start();