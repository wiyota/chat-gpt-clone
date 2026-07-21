/**
 * Vitest setup for the web app test suite.
 *
 * happy-dom (and some Node.js versions used by Vitest) do not always expose a
 * working `window.localStorage` implementation. Several unit tests and source
 * modules read from or write to `localStorage`, so polyfill it early before any
 * test module is imported.
 */
if (typeof window !== "undefined" && !window.localStorage) {
  const storage = new Map<string, string>();
  const fakeStorage: Storage = {
    get length() {
      return storage.size;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    clear() {
      storage.clear();
    },
  };

  Object.defineProperty(window, "localStorage", {
    value: fakeStorage,
    writable: true,
    configurable: true,
  });
}
