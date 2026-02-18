export interface IMcpPackage {
  imports: Record<string, string>;
  env?: string;
  apiHost?: string;
  contextModulesPath?: string;
}
