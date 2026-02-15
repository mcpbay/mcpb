export const addTagTypes = [
  "contexts",
  "catalogs",
  "contexts-versions",
  "context_versions",
  "auth",
  "tokens",
  "Mcp",
] as const;

export type ContextsControllerCreateContextApiResponse =
  /** status 201 The created context. */ CreateContextBody;
export type ContextsControllerCreateContextApiArg = {
  createContextBody: CreateContextBody;
};
export type ContextsControllerListContextsApiResponse =
  /** status 200 The contexts of the user. */ ListContextsResponse;
export type ContextsControllerListContextsApiArg = {
  /** The previous query last item id. */
  lastId?: number;
  /** The limit of the page. */
  size: number;
};
export type ContextsControllerGetContextApiResponse =
  /** status 200 The context. */ Context;
export type ContextsControllerGetContextApiArg = {
  contextId: number;
};
export type CatalogsControllerCreateCatalogApiResponse =
  /** status 200 The catalogs of the user. */ ListCatalogsResponse;
export type CatalogsControllerCreateCatalogApiArg = {
  createCatalogBody: CreateCatalogBody;
};
export type CatalogsControllerListCatalogApiResponse =
  /** status 200 The catalogs of the user. */ ListCatalogsResponse;
export type CatalogsControllerListCatalogApiArg = {
  /** Whatever the response must arrives with extended information or not. */
  extend?: ExtendType;
  /** The previous query last item id. */
  lastId?: number;
  /** The limit of the page. */
  size: number;
};
export type CatalogsControllerUpdateCatalogApiResponse =
  /** status 200 The updated catalog. */ Catalog;
export type CatalogsControllerUpdateCatalogApiArg = {
  catalogId: number;
  updateCatalogBody: UpdateCatalogBody;
};
export type CatalogsControllerDeleteCatalogApiResponse =
  /** status 200 The catalogs of the user. */ GenericResponse;
export type CatalogsControllerDeleteCatalogApiArg = {
  catalogId: number;
};
export type CatalogContextsControllerInsertContextVersionApiResponse =
  /** status 200 The updated catalog. */ Catalog;
export type CatalogContextsControllerInsertContextVersionApiArg = {
  catalogId: number;
  insertContextVersionBody: InsertContextVersionBody;
};
export type CatalogContextsControllerDeleteContextVersionApiResponse =
  /** status 200 The updated catalog. */ Catalog;
export type CatalogContextsControllerDeleteContextVersionApiArg = {
  contextVersionId: number;
  catalogId: number;
};
export type ContextVersionsControllerCreateContextVersionApiResponse =
  /** status 201 The created context version. */ CreateContextVersionBody;
export type ContextVersionsControllerCreateContextVersionApiArg = {
  contextId: number;
  createContextVersionBody: CreateContextVersionBody;
};
export type ContextVersionsControllerListContextVersionsApiResponse =
  /** status 200 The context versions. */ ListContextVersionsResponse;
export type ContextVersionsControllerListContextVersionsApiArg = {
  contextId: number;
  /** The previous query last item id. */
  lastId?: number;
  /** The limit of the page. */
  size: number;
};
export type ContextVersionsControllerUpdateContextVersionApiResponse =
  /** status 200 The updated context version. */ ContextVersion;
export type ContextVersionsControllerUpdateContextVersionApiArg = {
  contextId: number;
  contextVersionId: number;
  updateContextVersionBody: UpdateContextVersionBody;
};
export type ContextVersionsControllerDeleteContextVersionApiResponse =
  /** status 200 Whetever the context version was deleted. */ GenericResponse;
export type ContextVersionsControllerDeleteContextVersionApiArg = {
  contextVersionId: number;
  contextId: number;
};
export type AuthControllerRegisterUserApiResponse =
  /** status 200  */ GenericResponse;
export type AuthControllerRegisterUserApiArg = {
  registerUserBody: RegisterUserBody;
};
export type AuthControllerAuthenticateUserApiResponse =
  /** status 200  */ AuthenticateUserResponse;
export type AuthControllerAuthenticateUserApiArg = {
  authenticateUserBody: AuthenticateUserBody;
};
export type AuthControllerRequestValidationApiResponse =
  /** status 200  */ GenericResponse;
export type AuthControllerRequestValidationApiArg = void;
export type AuthControllerVerifyUserApiResponse =
  /** status 200  */ AuthenticateUserResponse;
export type AuthControllerVerifyUserApiArg = {
  verifyUserBody: VerifyUserBody;
};
export type AuthControllerCheckUserApiResponse =
  /** status 200  */ GenericResponse;
export type AuthControllerCheckUserApiArg = void;
export type TokensControllerCreateTokenApiResponse =
  /** status 201 The created token. */ Token;
export type TokensControllerCreateTokenApiArg = {
  createTokenBody: CreateTokenBody;
};
export type TokensControllerListTokensApiResponse =
  /** status 200 The created tokens. */ ListTokensResponse;
export type TokensControllerListTokensApiArg = {
  /** The previous query last item id. */
  lastId?: number;
  /** The limit of the page. */
  size: number;
};
export type TokensControllerDeleteTokenApiResponse =
  /** status 200 Wathever the token was deleted or not. */ GenericResponse;
export type TokensControllerDeleteTokenApiArg = {
  queryTokenId: number;
  pathTokenId: number;
};
export type McpControllerListInformationApiResponse =
  /** status 200 The catalog information */ Catalog;
export type McpControllerListInformationApiArg = {
  /** The catalog slug. */
  catalogSlug: string;
};
export type McpControllerListPromptsApiResponse =
  /** status 200 Every prompt within the catalog */ Prompt[];
export type McpControllerListPromptsApiArg = {
  /** The catalog slug. */
  catalogSlug: string;
};
export type McpControllerListResourcesApiResponse =
  /** status 200 Every resource within the catalog */ Resource[];
export type McpControllerListResourcesApiArg = {
  /** The catalog slug. */
  catalogSlug: string;
};
export type McpControllerReadResourceApiResponse =
  /** status 200 The resource was found. */ Resource;
export type McpControllerReadResourceApiArg = {
  resourceId: string;
  /** The catalog slug. */
  catalogSlug: string;
};
export type CreateContextBody = {
  /** The name of the context. */
  name: string;
  /** The description of the context. */
  description: string;
  /** The slug of the context. */
  slug: string;
  /** The type of the context. */
  type: ContextType;
};
export type Context = {
  /** The id of the entity. */
  id: number;
  /** The creation date of the entity. */
  createdAt: string;
  /** The update date of the entity. */
  updatedAt: string;
  /** The name of the context. */
  name: string;
  /** The description of the context. */
  description: string;
  /** The slug of the context. */
  slug: string;
  /** The type of the context. */
  type: ContextType;
};
export type ListContextsResponse = {
  /** The contexts. */
  items: Context[];
  /** Whether there are more contexts. */
  hasMore: boolean;
  /** The next page url. */
  nextUrl?: string;
};
export type PromptArgument = {
  /** The name of the argument. */
  name: string;
  /** The description of the argument. */
  description?: string;
  /** The required status of the argument. */
  required?: boolean;
};
export type PromptMessageContent = {
  /** The content of the message. */
  type: PromptMessageContentType;
  /** The content of the message, only use if `type` is `PromptMessageContentType.TEXT`. */
  text?: string;
  /** The url the prompt will use to generate the content of the message, only use if `type` is `PromptMessageContentType.WEBHOOK`. */
  url?: string;
  /** The mime type of the `data` member, only use if `type` is not `PromptMessageContentType.TEXT`. */
  mimeType?: string;
  /** The content of the message, only use if `type` is not `PromptMessageContentType.TEXT`. For images and audios, the base64 encoded data. */
  data?: string;
};
export type PromptMessage = {
  /** The content of the message. */
  role: MessageRole;
  /** The content of the message. */
  content: PromptMessageContent[];
};
export type Prompt = {
  /** The name of the prompt. */
  name: string;
  /** The title of the prompt. */
  title: string;
  /** The description of the prompt. */
  description: string;
  /** The arguments of the prompt. */
  arguments: PromptArgument[];
  /** The messages of the prompt. */
  messages: PromptMessage[];
};
export type ResourceAnnotation = {
  /** The role of the audience. */
  audience: MessageRole;
  /** The priority of the audience. */
  priority: number;
  /** The last modified of the resource. */
  lastModified: string;
};
export type Resource = {
  /** The uri of the resource. */
  uri: string;
  /** The name of the resource. */
  name: string;
  /** The title of the resource. */
  title: string;
  /** The description of the resource. */
  description: string;
  /** The mime type of the resource. */
  mimeType: string;
  /** The size of the resource. */
  size?: number | null;
  /** The text of the resource. Only for text/markdown or text mime types. Ups to 5MB. */
  text?: string | null;
  /** The blob of the resource. Only for binary files, it must be base64 encoded. */
  blob?: string | null;
  /** The annotations of the resource. */
  annotations?: ResourceAnnotation | null;
  /** The id of the resource. UUID. */
  id: string;
};
export type ContextVersion = {
  /** The id of the entity. */
  id: number;
  /** The creation date of the entity. */
  createdAt: string;
  /** The update date of the entity. */
  updatedAt: string;
  /** The version of the context version. */
  version: string;
  /** The description of the context version. */
  description?: string | null;
  /** The status of the context version. */
  status: ContextVersionStatus;
  /** The prompts of the context version. */
  prompts: Prompt[];
  /** The resources of the context version. */
  resources: Resource[];
  /** The context id of the context. */
  contextId: number;
  /** The context of the context version. */
  context: Context;
};
export type Catalog = {
  /** The id of the entity. */
  id: number;
  /** The creation date of the entity. */
  createdAt: string;
  /** The update date of the entity. */
  updatedAt: string;
  /** The name of the catalog. */
  name: string;
  /** The description of the catalog. */
  description?: string;
  /** The slug of the catalog. */
  slug: string;
  /** The context versions id of the catalog. */
  contextVersionsId: number[];
  /** The status of the catalog. */
  status: CatalogStatus;
  /** The context versions of the catalog. Only if the request was done with query `extended=yes`. */
  contextVersions: ContextVersion[];
};
export type ListCatalogsResponse = {
  /** The catalogs. */
  items: Catalog[];
  /** Whether there are more catalogs. */
  hasMore: boolean;
  /** The next page url. */
  nextUrl?: string;
};
export type CreateCatalogBody = {
  /** The name of the catalog. */
  name: string;
  /** The description of the catalog. */
  description?: string;
  /** The slug of the catalog. */
  slug: string;
  /** The status of the catalog. */
  status: CatalogStatus;
};
export type UpdateCatalogBody = {
  /** The name of the catalog. */
  name?: string;
  /** The description of the catalog. */
  description?: string;
  /** The status of the catalog. */
  status?: CatalogStatus;
};
export type GenericResponse = {
  /** The success of the operation. */
  success: boolean;
};
export type InsertContextVersionBody = {
  /** The id of the context version. */
  contextVersionId: number;
};
export type CreateContextVersionBody = {
  /** The version of the context version. */
  version: string;
  /** The description of the context version. */
  description?: string | null;
  /** The status of the context version. */
  status: ContextVersionStatus;
  /** The prompts of the context version. */
  prompts: Prompt[];
  /** The resources of the context version. */
  resources: Resource[];
};
export type ListContextVersionsResponse = {
  /** The context versions. */
  items: ContextVersion[];
  /** Whether there are more context versions. */
  hasMore: boolean;
  /** The next page url. */
  nextUrl?: string;
};
export type UpdateContextVersionBody = {
  /** The description of the context version. */
  description?: string | null;
  /** The status of the context version. */
  status?: ContextVersionStatus;
  /** The prompts of the context version. */
  prompts?: Prompt[];
  /** The resources of the context version. */
  resources?: Resource[];
};
export type RegisterUserBody = {
  /** The user's email. */
  email: string;
  /** The password of the new user account. */
  password: string;
};
export type AuthenticateUserResponse = {
  /** The access token of the authenticated user. */
  accessToken: string;
};
export type AuthenticateUserBody = {
  /** The user's email. */
  email: string;
  /** The password of the new user account. */
  password: string;
};
export type VerifyUserBody = {
  /** The code to use to try verify the user. */
  code: string;
};
export type Token = {
  /** The id of the entity. */
  id: number;
  /** The creation date of the entity. */
  createdAt: string;
  /** The update date of the entity. */
  updatedAt: string;
  /** The description of the token. */
  description: string;
  /** The token. */
  key: string;
};
export type CreateTokenBody = {
  /** The description of the token. */
  description: string;
  /** The access type of the token. */
  accessType: TokenAccessType;
};
export type ListTokensResponse = {
  /** The tokens. */
  items: Token[];
  /** Whether there are more tokens. */
  hasMore: boolean;
  /** The next page url. */
  nextUrl?: string;
};
export enum ContextType {
  PUBLIC = "public",
  PRIVATE = "private",
}
export enum CatalogStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}
export enum ContextVersionStatus {
  DRAFT = "draft",
  INTERNAL = "internal",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}
export enum MessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
}
export enum PromptMessageContentType {
  TEXT = "text",
  IMAGE = "image",
  AUDIO = "audio",
  RESOURCE = "resource",
  WEBHOOK = "webhook",
}
export enum ExtendType {
  YES = "yes",
  NO = "no",
}
export enum TokenAccessType {
  MCP = "mcp",
  API = "api",
}
