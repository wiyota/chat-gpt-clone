import { createSignal, onMount, onCleanup, createMemo } from "solid-js";

const STORAGE_KEY = "color-mode";

export type ColorModePreference = "auto" | "light" | "dark";

type ResolvedMode = "light" | "dark";

function getStoredPreference(): ColorModePreference {
  if (typeof window === "undefined") return "auto";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "auto" || stored === "light" || stored === "dark") return stored;
  return "auto";
}

function resolveMode(preference: ColorModePreference): ResolvedMode {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
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
  const resolved = createMemo(() => resolveMode(preference()));

  onMount(() => {
    applyMode(resolved());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (preference() === "auto") {
        const next = resolved();
        applyMode(next);
      }
    };
    media.addEventListener("change", listener);
    onCleanup(() => media.removeEventListener("change", listener));
  });

  const setMode = (next: ColorModePreference) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
    applyMode(resolveMode(next));
  };

  return { preference, resolved, setMode };
}
