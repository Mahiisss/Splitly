import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { useApp } from "@/state/AppProvider";
import { useStyles } from "@/theme/usePalette";

/** A short message at the bottom of the screen, with "Undo" after a delete. */
export function Toast() {
  const { toast, dismissToast } = useApp();
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);
  if (!toast) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + spacing.lg }]}>
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Text style={styles.text}>{toast.message}</Text>
        {toast.onUndo && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              toast.onUndo?.();
              dismissToast();
            }}
            style={styles.undo}
          >
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
    toast: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: c.ink,
      borderRadius: radii.pill,
      paddingVertical: spacing.sm,
      paddingLeft: spacing.lg + 2,
      paddingRight: spacing.sm,
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.line,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    text: { color: c.canvas, fontSize: fontSizes.small + 1, fontWeight: "500", flexShrink: 1, paddingRight: spacing.sm },
    undo: { backgroundColor: c.marigold, borderRadius: radii.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg - 2 },
    undoText: { color: c.onMarigold, fontWeight: "700", fontSize: fontSizes.small + 1 },
  });
