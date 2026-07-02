export class ManagedTimeouts {
  private readonly handles = new Map<string, ReturnType<typeof window.setTimeout>>();

  schedule(key: string, callback: () => void, delay: number): void {
    this.clear(key);
    const handle = window.setTimeout(() => {
      this.handles.delete(key);
      callback();
    }, delay);
    this.handles.set(key, handle);
  }

  clear(key: string): void {
    const handle = this.handles.get(key);

    if (handle === undefined) {
      return;
    }

    window.clearTimeout(handle);
    this.handles.delete(key);
  }

  clearAll(): void {
    this.handles.forEach((handle) => window.clearTimeout(handle));
    this.handles.clear();
  }
}
