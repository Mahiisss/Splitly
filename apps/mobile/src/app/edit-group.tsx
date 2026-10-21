import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildGroupEdit, currentUserId, memberInUse, type Group, type GroupEditDraft } from "@splitly/core";
import { avatarColors, fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { Avatar } from "@/components/Avatar";
import { ErrorText, Field, FormFooter, PrimaryButton, Section } from "@/components/Form";
import { useApp, useGroup } from "@/state/AppProvider";
import { usePalette, useStyles } from "@/theme/usePalette";

/** Rename a group, add people, or remove people who aren't in any expense yet. */
export default function EditGroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useGroup(groupId);
  const styles = useStyles(makeStyles);
  if (!group) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.name}>This group no longer exists.</Text>
      </View>
    );
  }
  return <EditGroupForm group={group} />;
}

function EditGroupForm({ group }: { group: Group }) {
  const { dispatch, showToast } = useApp();
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<GroupEditDraft>({
    name: group.name,
    keep: group.members.map((m) => m.id),
    newNames: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const check = buildGroupEdit(group, draft, currentUserId, () => "");
  const errors = submitted && !check.ok ? check.errors : {};
  const kept = group.members.filter((m) => draft.keep.includes(m.id));

  function save() {
    setSubmitted(true);
    const result = buildGroupEdit(group, draft, currentUserId, () => Crypto.randomUUID());
    if (!result.ok) return;
    dispatch({ type: "updateGroup", groupId: group.id, ...result.value });
    showToast({ message: "Group updated." });
    router.back();
  }

  const setNew = (index: number, value: string) =>
    setDraft((d) => ({ ...d, newNames: d.newNames.map((n, i) => (i === index ? value : n)) }));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Section label="Group name">
          <Field value={draft.name} onChangeText={(name) => setDraft((d) => ({ ...d, name }))} error={errors.name} />
        </Section>

        <Section label="People">
          <View style={styles.list}>
            {kept.map((m, index) => {
              const isYou = m.id === currentUserId;
              const inUse = memberInUse(group, m.id);
              return (
                <View key={m.id} style={[styles.row, index > 0 && styles.divider]}>
                  <Avatar member={m} members={group.members} />
                  <Text style={styles.name}>{isYou ? "You" : m.name}</Text>
                  {isYou ? (
                    <Text style={styles.muted}>Always included</Text>
                  ) : inUse ? (
                    <Text style={styles.muted}>In expenses</Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${m.name}`}
                      hitSlop={8}
                      onPress={() => setDraft((d) => ({ ...d, keep: d.keep.filter((id) => id !== m.id) }))}
                    >
                      <Ionicons name="close" size={20} color={c.muted} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>

          {draft.newNames.map((name, index) => {
            const color = avatarColors(kept.length + index);
            return (
              <View key={index} style={styles.newRow}>
                <View style={[styles.badge, { backgroundColor: color.background }]}>
                  <Text style={[styles.badgeText, { color: color.text }]}>
                    {name.trim() ? name.trim()[0]!.toUpperCase() : "+"}
                  </Text>
                </View>
                <View style={styles.flexOne}>
                  <Field
                    accessibilityLabel={`New person ${index + 1}`}
                    placeholder="Name"
                    value={name}
                    onChangeText={(text) => setNew(index, text)}
                    autoCapitalize="words"
                    autoFocus={index === draft.newNames.length - 1}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove new person ${index + 1}`}
                  hitSlop={8}
                  onPress={() => setDraft((d) => ({ ...d, newNames: d.newNames.filter((_, i) => i !== index) }))}
                >
                  <Ionicons name="close" size={20} color={c.muted} />
                </Pressable>
              </View>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={() => setDraft((d) => ({ ...d, newNames: [...d.newNames, ""] }))}
            style={styles.addRow}
            hitSlop={6}
          >
            <Ionicons name="add" size={18} color={c.ink} />
            <Text style={styles.addText}>Add a person</Text>
          </Pressable>
          {errors.members && <ErrorText>{errors.members}</ErrorText>}
        </Section>
      </ScrollView>
      <FormFooter bottomInset={insets.bottom}>
        <PrimaryButton label="Save changes" onPress={save} />
      </FormFooter>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.canvas },
    flexOne: { flex: 1 },
    center: { alignItems: "center", justifyContent: "center" },
    page: { padding: spacing.lg, gap: spacing.xl },
    list: { backgroundColor: c.surface, borderRadius: radii.md, borderWidth: 1, borderColor: c.line },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, minHeight: 52 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    name: { flex: 1, fontSize: fontSizes.body, fontWeight: "600", color: c.ink },
    muted: { color: c.muted, fontSize: fontSizes.small },
    newRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    badge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    badgeText: { fontSize: 11, fontWeight: "700" },
    addRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start", paddingVertical: spacing.xs },
    addText: { color: c.ink, fontSize: fontSizes.small + 1, fontWeight: "700" },
  });
