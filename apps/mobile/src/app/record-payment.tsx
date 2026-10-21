import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildSettlement, currentUserId, formatMoney, type Group, type PaymentDraft } from "@splitly/core";
import { fontSizes, spacing, type Palette } from "@splitly/theme";
import { Avatar } from "@/components/Avatar";
import { Chip, Chips, ErrorText, Field, FormFooter, PrimaryButton, Section } from "@/components/Form";
import { useApp, useGroup } from "@/state/AppProvider";
import { useStyles } from "@/theme/usePalette";

type Params = { groupId: string; from?: string; to?: string; amount?: string };

/** Opened from "Record a payment", or pre-filled from a "Mark as paid" suggestion. */
export default function RecordPaymentScreen() {
  const params = useLocalSearchParams<Params>();
  const group = useGroup(params.groupId);
  const styles = useStyles(makeStyles);
  if (!group) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.message}>This group no longer exists.</Text>
      </View>
    );
  }
  return <PaymentForm group={group} params={params} />;
}

function PaymentForm({ group, params }: { group: Group; params: Params }) {
  const { dispatch, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);
  const members = group.members;
  const memberIds = members.map((m) => m.id);
  const fallbackFrom = members.find((m) => m.id !== currentUserId)?.id ?? currentUserId;

  const [draft, setDraft] = useState<PaymentDraft>({
    from: params.from && memberIds.includes(params.from) ? params.from : fallbackFrom,
    to: params.to && memberIds.includes(params.to) ? params.to : currentUserId,
    amount: params.amount ?? "",
  });
  const [submitted, setSubmitted] = useState(false);
  const preview = buildSettlement(draft, memberIds, { id: "preview", createdAt: "" });
  const errors = submitted && !preview.ok ? preview.errors : {};
  const name = (id: string) => (id === currentUserId ? "You" : (members.find((m) => m.id === id)?.name ?? id));

  function save() {
    setSubmitted(true);
    const result = buildSettlement(draft, memberIds, { id: Crypto.randomUUID(), createdAt: new Date().toISOString() });
    if (!result.ok) return;
    dispatch({ type: "group", groupId: group.id, action: { type: "addSettlement", settlement: result.value } });
    showToast({ message: `Payment of ${formatMoney(result.value.amount)} recorded.` });
    router.back();
  }

  const people = (key: "from" | "to", label: string) => (
    <Section label={label}>
      <Chips>
        {members.map((m) => (
          <Chip
            key={m.id}
            label={name(m.id)}
            selected={draft[key] === m.id}
            onPress={() => setDraft((d) => ({ ...d, [key]: m.id }))}
            leading={<Avatar member={m} members={members} size={28} />}
          />
        ))}
      </Chips>
    </Section>
  );

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {people("from", "Who paid?")}
        {people("to", "Who got the money?")}
        {errors.people && <ErrorText>{errors.people}</ErrorText>}
        <Section label="Amount">
          <Field
            prefix="₹"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={draft.amount}
            onChangeText={(amount) => setDraft((d) => ({ ...d, amount }))}
            error={errors.amount}
          />
        </Section>
      </ScrollView>
      <FormFooter bottomInset={insets.bottom}>
        <PrimaryButton label="Record payment" onPress={save} />
      </FormFooter>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.canvas },
    center: { alignItems: "center", justifyContent: "center" },
    message: { color: c.ink, fontSize: fontSizes.body },
    page: { padding: spacing.lg, gap: spacing.xl },
  });
