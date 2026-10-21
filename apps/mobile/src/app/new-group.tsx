import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildGroup, demoCurrentUser, type GroupDraft } from "@splitly/core";
import { avatarColors, fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { Avatar } from "@/components/Avatar";
import { ErrorText, Field, FormFooter, PrimaryButton, Section } from "@/components/Form";
import { useApp } from "@/state/AppProvider";
import { usePalette, useStyles } from "@/theme/usePalette";

const placeholders = ["Kabir", "Isha", "Arjun", "Meera"];

export default function NewGroupScreen() {
  const { dispatch, showToast } = useApp();
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const you = demoCurrentUser;
  const [draft, setDraft] = useState<GroupDraft>({ name: "", memberNames: ["", ""] });
  const [submitted, setSubmitted] = useState(false);
  const check = buildGroup(draft, you, { id: "", createdAt: "", newId: () => "" });
  const errors = submitted && !check.ok ? check.errors : {};

  const setMember = (index: number, value: string) =>
    setDraft((d) => ({ ...d, memberNames: d.memberNames.map((n, i) => (i === index ? value : n)) }));

  function save() {
    setSubmitted(true);
    const result = buildGroup(draft, you, {
      id: Crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      newId: () => Crypto.randomUUID(),
    });
    if (!result.ok) return;
    dispatch({ type: "createGroup", group: result.value });
    showToast({ message: `Created “${result.value.name}”.` });
    router.replace({ pathname: "/group/[id]", params: { id: result.value.id } });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Section label="Group name">
          <Field
            placeholder="Manali trip"
            value={draft.name}
            onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
            error={errors.name}
            autoFocus
          />
        </Section>

        <Section label="Who's in it?">
          <View style={styles.youRow}>
            <Avatar member={you} members={[you]} />
            <Text style={styles.youText}>You</Text>
            <Text style={styles.muted}>Always included</Text>
          </View>
          {draft.memberNames.map((name, index) => {
            const color = avatarColors(index + 1);
            return (
              <View key={index} style={styles.memberRow}>
                <View style={[styles.badge, { backgroundColor: color.background }]}>
                  <Text style={[styles.badgeText, { color: color.text }]}>
                    {name.trim() ? name.trim()[0]!.toUpperCase() : index + 2}
                  </Text>
                </View>
                <View style={styles.flexOne}>
                  <Field
                    accessibilityLabel={`Person ${index + 2}`}
                    placeholder={placeholders[index % placeholders.length]}
                    value={name}
                    onChangeText={(text) => setMember(index, text)}
                    autoCapitalize="words"
                  />
                </View>
                {draft.memberNames.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove person ${index + 2}`}
                    hitSlop={8}
                    onPress={() => setDraft((d) => ({ ...d, memberNames: d.memberNames.filter((_, i) => i !== index) }))}
                  >
                    <Ionicons name="close" size={20} color={c.muted} />
                  </Pressable>
                )}
              </View>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft((d) => ({ ...d, memberNames: [...d.memberNames, ""] }))}
            style={styles.addRow}
            hitSlop={6}
          >
            <Ionicons name="add" size={18} color={c.ink} />
            <Text style={styles.addText}>Add another person</Text>
          </Pressable>
          {errors.members && <ErrorText>{errors.members}</ErrorText>}
        </Section>
      </ScrollView>
      <FormFooter bottomInset={insets.bottom}>
        <PrimaryButton label="Create group" onPress={save} />
      </FormFooter>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.canvas },
    flexOne: { flex: 1 },
    page: { padding: spacing.lg, gap: spacing.xl },
    youRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      minHeight: 48,
    },
    youText: { flex: 1, color: c.ink, fontSize: fontSizes.body, fontWeight: "600" },
    muted: { color: c.muted, fontSize: fontSizes.small },
    memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    badge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    badgeText: { fontSize: 11, fontWeight: "700" },
    addRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", paddingVertical: spacing.xs },
    addText: { color: c.ink, fontSize: fontSizes.small + 1, fontWeight: "700" },
  });
