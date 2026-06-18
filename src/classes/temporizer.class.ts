export class Temporizer {
  private times = new Map<string, number>();

  public start(key: string | string[], time: number): void {
    const keyString = Array.isArray(key) ? key.join(":") : key;
    this.times.set(keyString, Date.now() + time);
  }

  public left(key: string | string[]): number {
    const keyString = Array.isArray(key) ? key.join(":") : key;

    if (this.times.has(keyString)) {
      return Math.max(0, this.times.get(keyString)! - Date.now());
    }

    return 0;
  }

  public stop(key: string | string[]): number {
    const keyString = Array.isArray(key) ? key.join(":") : key;
    const start = this.times.get(keyString);

    if (start) {
      this.times.delete(keyString);
      return Date.now() - start;
    }

    return 0;
  }
}