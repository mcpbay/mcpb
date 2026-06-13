export interface IImport {
  version: string;
  ref: string;
  type: "local" | "remote";
}

export interface IMcpPackage {
  imports: Record<string, string | IImport>;
  envFile?: string;
  env?: Partial<{
    MCPBAY_API_KEY: string;
    API_HOST: string;
    CONTEXTS_PATH: string;
  }>;
}
