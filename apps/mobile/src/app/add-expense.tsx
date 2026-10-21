import Ionicons from "@expo/vector-icons/Ionicons";
import * as Crypto from "expo-crypto";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  buildExpense,
  currentUserId,
  draftFromExpense,
  EXPENSE_CATEGORIES,
  formatMoney,
  previewExpense,
  type ExpenseDraft,
  type Group,
  type SplitMethod,
} from "@splitly/core";
import { categoryStyles, fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { categoryIcons } from "@/components/ActivityFeed";
import { Avatar } from "@/components/Avatar";
import { Chip, Chips, ErrorText, Field, FormFooter, PrimaryButton, Section } from "@/components/Form";
import { useApp, useGroup } from "@/state/AppProvider";
import { usePalette, useStyles } from "@/theme/usePalette";

const methods: { value: SplitMethod; label: string }[] = [
  { value: "equal", label: "Equally" },
  { value: "shares", label: "By shares" },
  { value: "exact", label: "Exact" },
];

/** Adds an expense to a group, or edits one when `expenseId` is given. */
export default function ExpenseScreen() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId?: string }>();
  const group = useGroup(groupId);
  const styles = useStyles(makeStyles);
  if (!group) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.personName}>This group no longer exists.</Text>
      </View>
    );
  }
  return <ExpenseForm group={group} expenseId={expenseId} />;
}

function ExpenseForm({ group, expenseId }: { group: Group; expenseId?: string }) {
  const { dispatch, showToast } = useApp();
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const members = group.members;
  const memberIds = members.map((m) => m.id);
  const editing = group.expenses.find((e) => e.id === expenseId) ?? null;

  const [draft, setDraft] = useState<ExpenseDraft>(() =>
    editing
      ? draftFromExpense(editing, memberIds)
      : {
          description: "",
          amount: "",
          paidBy: currentUserId,
          category: "food",
          method: "equal",
          included: memberIds,
          values: {},
        },
  );
  const [submitted, setSubmitted] = useState(false);
  const update = (patch: Partial<ExpenseDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const preview = previewExpense(draft, memberIds);
  const shareOf = new Map(preview.splits?.map((s) => [s.userId, s.amount]));
  const errors = submitted ? preview.errors : {};
  const name = (id: string) => (id === currentUserId ? "You" : (members.find((m) => m.id === id)?.name ?? id));

  function save() {
    setSubmitted(true);
    const meta = editing
      ? { id: editing.id, createdAt: editing.createdAt } // keep its place in the activity feed
      : { id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
    const result = buildExpense(draft, memberIds, meta);
    if (!result.ok) return;
    dispatch({
      type: "group",
      groupId: group.id,
      action: editing ? { type: "updateExpense", expense: result.value } : { type: "addExpense", expense: result.value },
    });
    showToast({ message: editing ? "Changes saved." : `Added “${result.value.description}”.` });
    router.back();
  }

  const splitStatus =
    draft.method === "exact" && preview.amount !== null && preview.remaining === 0
      ? { text: "Every rupee is assigned.", color: c.owed }
      : preview.errors.split && (draft.method === "exact" || preview.amount !== null)
        ? { text: preview.errors.split, color: submitted ? c.owes : c.muted }
        : null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: editing ? "Edit expense" : "Add an expense" }} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Section label="What was it for?">
          <Field
            placeholder="Dinner at Thalassa"
            value={draft.description}
            onChangeText={(description) => update({ description })}
            error={errors.description}
            autoFocus={!editing}
          />
        </Section>

        <Section label="Amount">
          <Field
            prefix="₹"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={draft.amount}
            onChangeText={(amount) => update({ amount })}
            error={errors.amount}
            style={styles.amount}
          />
        </Section>

        <Section label="Category">
          <Chips>
            {EXPENSE_CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={categoryStyles[category]!.label}
                selected={draft.category === category}
                onPress={() => update({ category })}
                leading={
                  <Ionicons
                    name={categoryIcons[category]}
                    size={16}
                    color={draft.category === category ? c.canvas : c.ink}
                    style={styles.chipIcon}
                  />
                }
              />
            ))}
          </Chips>
        </Section>

        <Section label="Paid by">
          <Chips>
            {members.map((m) => (
              <Chip
                key={m.id}
                label={name(m.id)}
                selected={draft.paidBy === m.id}
                onPress={() => update({ paidBy: m.id })}
                leading={<Avatar member={m} members={members} size={28} />}
              />
            ))}
          </Chips>
        </Section>

        <Section label="Split">
          <View style={styles.segmented} accessibilityRole="radiogroup">
            {methods.map((m) => {
              const selected = draft.method === m.value;
              return (
                <Pressable
                  key={m.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => update({ method: m.value, values: {} })}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.people}>
            {members.map((m, index) => {
              const included = draft.included.includes(m.id);
              const share = shareOf.get(m.id);
              return (
                <View key={m.id} style={[styles.person, index > 0 && styles.divider]}>
                  {draft.method === "equal" && (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: included }}
                      accessibilityLabel={`Include ${name(m.id)}`}
                      hitSlop={8}
                      onPress={() =>
                        update({
                          included: included ? draft.included.filter((id) => id !== m.id) : [...draft.included, m.id],
                        })
                      }
                      style={[styles.checkbox, included && styles.checkboxOn]}
                    >
                      {included && <Ionicons name="checkmark" size={14} color={c.canvas} />}
                    </Pressable>
                  )}
                  <Avatar member={m} members={members} />
                  <Text style={styles.personName} numberOfLines={1}>
                    {name(m.id)}
                  </Text>
                  {draft.method !== "equal" && (
                    <TextInput
                      accessibilityLabel={`${draft.method === "shares" ? "Shares" : "Amount"} for ${name(m.id)}`}
                      keyboardType={draft.method === "shares" ? "number-pad" : "decimal-pad"}
                      placeholder="0"
                      placeholderTextColor={c.muted}
                      value={draft.values[m.id] ?? ""}
                      onChangeText={(text) => update({ values: { ...draft.values, [m.id]: text } })}
                      style={[styles.smallInput, draft.method === "exact" ? styles.exactInput : styles.sharesInput]}
                    />
                  )}
                  {draft.method !== "exact" && <Text style={styles.share}>{share ? formatMoney(share) : "–"}</Text>}
                </View>
              );
            })}
          </View>
          {splitStatus && <Text style={[styles.status, { color: splitStatus.color }]}>{splitStatus.text}</Text>}
        </Section>

        {submitted && Object.keys(preview.errors).length > 0 && (
          <ErrorText>Fix the highlighted fields to {editing ? "save" : "add"} this expense.</ErrorText>
        )}
      </ScrollView>

      <FormFooter bottomInset={insets.bottom}>
        <PrimaryButton label={editing ? "Save changes" : "Add expense"} onPress={save} />
      </FormFooter>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.canvas },
    center: { alignItems: "center", justifyContent: "center" },
    page: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
    amount: { fontWeight: "700", fontSize: fontSizes.title },
    chipIcon: { marginLeft: spacing.xs },
    segmented: { flexDirection: "row", backgroundColor: c.line, borderRadius: radii.pill, padding: 3 },
    segment: { flex: 1, height: 36, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
    segmentSelected: { backgroundColor: c.surface },
    segmentText: { fontSize: fontSizes.small + 1, fontWeight: "600", color: c.muted },
    segmentTextSelected: { color: c.ink },
    people: { backgroundColor: c.surface, borderRadius: radii.md, borderWidth: 1, borderColor: c.line },
    person: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, minHeight: 56 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOn: { backgroundColor: c.ink, borderColor: c.ink },
    personName: { flex: 1, fontSize: fontSizes.body, fontWeight: "500", color: c.ink },
    smallInput: {
      height: 38,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.line,
      paddingHorizontal: spacing.sm,
      textAlign: "right",
      fontSize: fontSizes.body,
      color: c.ink,
    },
    sharesInput: { width: 56 },
    exactInput: { width: 104 },
    share: { width: 92, textAlign: "right", color: c.muted, fontSize: fontSizes.small, fontVariant: ["tabular-nums"] },
    status: { fontSize: fontSizes.small },
  });
