import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { useStyles } from "@/theme/usePalette";

/** A rounded surface with a title. `panel` is the dark settle-up style. */
export function Card({
  title,
  panel,
  action,
  children,
  style,
}: {
  title: string;
  panel?: boolean;
  /** Shown to the right of the title, e.g. a Share button. */
  action?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.card, panel && styles.panel, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, panel && styles.panelTitle]} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderColor: c.line,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.lg,
      padding: spacing.lg + 2,
    },
    panel: { backgroundColor: c.panel, borderColor: c.panel },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
    title: { fontSize: fontSizes.title, fontWeight: "700", color: c.ink, letterSpacing: -0.3 },
    panelTitle: { color: c.onPanel },
  });
