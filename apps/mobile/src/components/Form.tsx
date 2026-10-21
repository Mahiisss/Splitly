import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { usePalette, useStyles } from "@/theme/usePalette";

/** Small building blocks shared by the form screens. */

export function Section({ label, children }: { label: string; children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export function Field({ error, prefix, style, ...props }: TextInputProps & { error?: string; prefix?: string }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.flexShrink}>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput placeholderTextColor={c.muted} style={[styles.input, style]} {...props} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return <Text style={styles.error}>{children}</Text>;
}

export function Chip({
  label,
  selected,
  onPress,
  leading,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected, leading ? styles.chipWithLeading : null]}
    >
      {leading}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {children}
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

/** The bar at the bottom of a form screen that holds its main button. */
export function FormFooter({ children, bottomInset }: { children: ReactNode; bottomInset: number }) {
  const styles = useStyles(makeStyles);
  return <View style={[styles.footer, { paddingBottom: bottomInset + spacing.md }]}>{children}</View>;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    section: { gap: spacing.sm },
    label: { fontSize: fontSizes.small + 1, fontWeight: "600", color: c.ink },
    flexShrink: { flexShrink: 1 },
    field: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 48,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      paddingHorizontal: spacing.md,
    },
    fieldError: { borderColor: c.owes },
    prefix: { color: c.muted, fontSize: fontSizes.body, marginRight: spacing.xs },
    input: { flex: 1, fontSize: fontSizes.body + 1, color: c.ink, paddingVertical: spacing.sm },
    error: { color: c.owes, fontSize: fontSizes.small, marginTop: spacing.xs },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      height: 40,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    chipWithLeading: { paddingLeft: spacing.xs + 2 },
    chipSelected: { backgroundColor: c.ink, borderColor: c.ink },
    chipText: { fontSize: fontSizes.small + 1, fontWeight: "600", color: c.ink },
    chipTextSelected: { color: c.canvas },
    primary: {
      height: 50,
      borderRadius: radii.pill,
      backgroundColor: c.marigold,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryText: { fontSize: fontSizes.body, fontWeight: "700", color: c.onMarigold },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      backgroundColor: c.canvas,
    },
  });
