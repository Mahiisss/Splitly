"use client";

import { useSyncExternalStore } from "react";

/**
 * Light / dark mode. With no choice saved, the site follows the device setting.
 * Choosing a mode sets data-theme on <html>, which themeCss() in
 * @splitly/theme uses to pick the colours.
 */

export const THEME_STORAGE_KEY = "splitly:theme";
type Theme = "light" | "dark";

/**
 * Runs in <head> before the page is painted, so a saved dark-mode choice
 * doesn't flash light first.
 */
export const themeScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const CHANGE_EVENT = "splitly:themechange";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function subscribe(onChange: () => void) {
  const query = media();
  query.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return media().matches ? "dark" : "light";
}

/** The theme in use, or null while rendering on the server (where it's unknown). */
export function useTheme(): [Theme | null, () => void] {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The choice just won't be remembered.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return [theme, toggle];
}
