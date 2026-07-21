import { createSignal, onMount, onCleanup, createMemo, createEffect } from "solid-js";

const STORAGE_KEY = "color-mode";

export type ColorModePreference = "auto" | "light" | "dark";

type ResolvedMode = "light" | "dark";

function getStoredPreference(): ColorModePreference {
  if (typeof window === "undefined" || !window.localStorage) return "auto";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "auto" || stored === "light" || stored === "dark") return stored;
  return "auto";
}

function getSystemMode(): ResolvedMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyMode(mode: ResolvedMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.setAttribute("data-kb-theme", "dark");
  } else {
    root.removeAttribute("data-kb-theme");
  }
}

export function createColorMode() {
  const [preference, setPreference] = createSignal<ColorModePreference>(getStoredPreference());
  const [systemMode, setSystemMode] = createSignal<ResolvedMode>(getSystemMode());
  const resolved = createMemo<ResolvedMode>(() => {
    const p = preference();
    if (p === "light") return "light";
    if (p === "dark") return "dark";
    return systemMode();
  });

  createEffect(() => {
    applyMode(resolved());
  });

  onMount(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemMode(media.matches ? "dark" : "light");
    media.addEventListener("change", listener);
    onCleanup(() => media.removeEventListener("change", listener));
  });

  const setMode = (next: ColorModePreference) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    setPreference(next);
  };

  return { preference, resolved, setMode };
}
