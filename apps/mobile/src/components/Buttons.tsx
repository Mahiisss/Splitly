import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text } from "react-native";
import { fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { usePalette, useStyles } from "@/theme/usePalette";

/** The pill buttons used on the home and group screens. */
export function PillButton({
  label,
  onPress,
  primary,
  icon,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  icon?: "add";
}) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary ? styles.primary : styles.secondary, pressed && styles.pressed]}
    >
      {icon && <Ionicons name={icon} size={18} color={primary ? c.onPrimary : c.ink} />}
      <Text style={[styles.text, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}

/** A small underlined text button, e.g. "Reset to sample data". */
export function LinkButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={[styles.link, danger && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    button: {
      height: 44,
      paddingHorizontal: spacing.lg + 2,
      borderRadius: radii.pill,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
    },
    secondary: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    primary: { backgroundColor: c.primary },
    pressed: { opacity: 0.85 },
    text: { fontSize: fontSizes.small + 1, fontWeight: "700", color: c.ink },
    primaryText: { color: c.onPrimary },
    link: { color: c.ink, fontSize: fontSizes.small, fontWeight: "600", textDecorationLine: "underline" },
    danger: { color: c.owes },
  });
