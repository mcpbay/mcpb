export interface IMcpPackage {
  imports: Record<string, string>;
  env?: string;
  contextModulesPath?: string;
}