export class ManagedTimeouts {
  private readonly handles = new Map<string, any>();

  schedule(key: string, callback: () => void, delay: number): void {
    this.clear(key);
    const handle = setTimeout(() => {
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

    clearTimeout(handle);
    this.handles.delete(key);
  }

  clearAll(): void {
    this.handles.forEach((handle) => clearTimeout(handle));
    this.handles.clear();
  }
}
