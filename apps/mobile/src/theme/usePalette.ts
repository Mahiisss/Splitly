import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { themes, type Palette, type ThemeName } from "@splitly/theme";

/** "light" or "dark", following the phone's setting. */
export function useThemeName(): ThemeName {
  return useColorScheme() === "dark" ? "dark" : "light";
}

/** The colours for the phone's current light / dark setting. */
export function usePalette(): Palette {
  return themes[useThemeName()];
}

/**
 * Builds a component's styles from the current colours, and rebuilds them
 * only when the phone switches between light and dark mode.
 * Pass a function defined outside the component so it stays the same.
 */
export function useStyles<T>(makeStyles: (c: Palette) => T): T {
  const palette = usePalette();
  return useMemo(() => makeStyles(palette), [makeStyles, palette]);
}
