export class Memoizer {
  private cache = new Map<string, unknown>();

  public has(key: string | string[]): boolean {
    const keyString = Array.isArray(key) ? key.join(":") : key;
    return this.cache.has(keyString);
  }

  public set(key: string | string[], value: unknown): void {
    const keyString = Array.isArray(key) ? key.join(":") : key;
    this.cache.set(keyString, value);
  }

  public get(key: string | string[]): unknown {
    const keyString = Array.isArray(key) ? key.join(":") : key;
    return this.cache.get(keyString);
  }
}