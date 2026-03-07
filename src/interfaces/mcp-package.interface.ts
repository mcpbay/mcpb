export interface IMcpPackage {
  imports: Record<string, string>;
  envFile?: string;
  env?: Partial<{
    MCPBAY_API_KEY: string;
    API_HOST: string;
    CONTEXTS_PATH: string;
  }>;
}
