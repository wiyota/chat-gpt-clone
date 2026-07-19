import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "solid-js/web";
import { createColorMode } from "./color-mode";

function getThemeAttr() {
  return document.documentElement.getAttribute("data-kb-theme");
}

function createMockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(event: Event) => void>();
  let current = initialMatches;
  const mql = {
    get matches() {
      return current;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null as EventListener | null,
    addListener: vi.fn((listener: EventListener) => listeners.add(listener)),
    removeListener: vi.fn((listener: EventListener) => listeners.delete(listener)),
    addEventListener: vi.fn((_: string, listener: (event: Event) => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_: string, listener: (event: Event) => void) => {
      listeners.delete(listener);
    }),
    dispatchEvent: vi.fn(() => true),
    setMatches(next: boolean) {
      current = next;
      listeners.forEach((listener) =>
        listener(new MediaQueryListEvent("change", { matches: next, media: this.media })),
      );
    },
  };
  window.matchMedia = vi.fn(() => mql) as typeof window.matchMedia;
  return mql;
}

function renderColorMode() {
  let api: ReturnType<typeof createColorMode> | undefined;
  function App() {
    api = createColorMode();
    return document.createElement("div");
  }
  const dispose = render(App, document.createElement("div"));
  if (!api) throw new Error("createColorMode did not initialize");
  return { api, dispose };
}

describe("createColorMode", () => {
  beforeEach(() => {
    window.localStorage.removeItem("color-mode");
    document.documentElement.removeAttribute("data-kb-theme");
  });

  it("defaults to auto and resolves to light when the system prefers light", () => {
    createMockMatchMedia(false);
    const { api } = renderColorMode();
    expect(api.preference()).toBe("auto");
    expect(api.resolved()).toBe("light");
    expect(getThemeAttr()).toBeNull();
  });

  it("defaults to auto and resolves to dark when the system prefers dark", () => {
    createMockMatchMedia(true);
    const { api } = renderColorMode();
    expect(api.preference()).toBe("auto");
    expect(api.resolved()).toBe("dark");
    expect(getThemeAttr()).toBe("dark");
  });

  it("reads the stored preference from localStorage", () => {
    window.localStorage.setItem("color-mode", "dark");
    createMockMatchMedia(false);
    const { api } = renderColorMode();
    expect(api.preference()).toBe("dark");
    expect(api.resolved()).toBe("dark");
    expect(getThemeAttr()).toBe("dark");
  });

  it("setMode persists and applies the chosen mode", () => {
    createMockMatchMedia(false);
    const { api } = renderColorMode();

    api.setMode("dark");
    expect(window.localStorage.getItem("color-mode")).toBe("dark");
    expect(api.preference()).toBe("dark");
    expect(api.resolved()).toBe("dark");
    expect(getThemeAttr()).toBe("dark");

    api.setMode("light");
    expect(window.localStorage.getItem("color-mode")).toBe("light");
    expect(api.preference()).toBe("light");
    expect(api.resolved()).toBe("light");
    expect(getThemeAttr()).toBeNull();
  });

  it("setMode auto follows the current system preference", () => {
    const mql = createMockMatchMedia(false);
    const { api } = renderColorMode();

    api.setMode("auto");
    expect(window.localStorage.getItem("color-mode")).toBe("auto");
    expect(api.preference()).toBe("auto");
    expect(api.resolved()).toBe("light");
    expect(getThemeAttr()).toBeNull();

    mql.setMatches(true);
    expect(api.resolved()).toBe("dark");
    expect(getThemeAttr()).toBe("dark");

    mql.setMatches(false);
    expect(api.resolved()).toBe("light");
    expect(getThemeAttr()).toBeNull();
  });

  it("registers and removes the system preference listener on mount/unmount", () => {
    const mql = createMockMatchMedia(false);
    const { dispose } = renderColorMode();
    expect(mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    dispose();
    expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
