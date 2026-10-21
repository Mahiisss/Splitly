import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  amountToInput,
  demoCurrentUserId,
  formatMoney,
  joinNames,
  settleUpMessage,
  summarizeGroup,
  type ActivityItem,
  type Transfer,
} from "@splitly/core";
import { fontSizes, spacing, type Palette } from "@splitly/theme";
import { ActivityFeed } from "@/components/ActivityFeed";
import { AvatarStack } from "@/components/Avatar";
import { BalanceChart } from "@/components/BalanceChart";
import { LinkButton, PillButton } from "@/components/Buttons";
import { SettleUp } from "@/components/SettleUp";
import { useApp, useGroup } from "@/state/AppProvider";
import { usePalette, useStyles } from "@/theme/usePalette";

function yourPosition(balance: number): string {
  if (balance > 0) return `You get back ${formatMoney(balance)}.`;
  if (balance < 0) return `You owe ${formatMoney(-balance)}.`;
  return "You're all settled up.";
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroup(id);
  const { app, dispatch, showToast } = useApp();
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const currentUserId = demoCurrentUserId;

  const summary = useMemo(
    () => (group ? summarizeGroup(group.members, group.expenses, group.settlements) : null),
    [group],
  );

  if (!group || !summary) {
    return (
      <SafeAreaView style={[styles.safe, styles.notFound]}>
        <Text style={styles.position}>Group not found</Text>
        <Text style={styles.total}>It may have been deleted.</Text>
        <PillButton label="Back to your groups" onPress={() => router.replace("/")} />
      </SafeAreaView>
    );
  }

  const groupId = group.id;
  const members = group.members;
  const myBalance = summary.balances.find((b) => b.member.id === currentUserId)?.balance ?? 0;
  const expenseCount = group.expenses.length;

  function remove(item: ActivityItem) {
    dispatch({ type: "group", groupId, action: { type: "remove", id: item.id } });
    const what = item.kind === "expense" ? `“${item.expense.description}”` : "Payment";
    showToast({
      message: `${what} deleted.`,
      onUndo: () => dispatch({ type: "group", groupId, action: { type: "restore", item } }),
    });
  }

  function markPaid(t: Transfer) {
    router.push({ pathname: "/record-payment", params: { groupId, from: t.from, to: t.to, amount: amountToInput(t.amount) } });
  }

  function deleteGroup() {
    if (!group) return;
    const deleted = group;
    const index = app.groups.findIndex((g) => g.id === groupId);
    dispatch({ type: "deleteGroup", id: groupId });
    router.back();
    showToast({
      message: `“${deleted.name}” deleted.`,
      onUndo: () => dispatch({ type: "restoreGroup", group: deleted, index }),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color={c.muted} />
            <Text style={styles.backText}>All groups</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/edit-group", params: { groupId } })}
            style={styles.back}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={17} color={c.muted} />
            <Text style={styles.backText}>Edit group</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.membersRow}>
            <AvatarStack members={members} />
            <Text style={styles.memberNames} numberOfLines={1}>
              {joinNames(members.map((m) => (m.id === currentUserId ? "You" : m.name)))}
            </Text>
          </View>
          <Text style={styles.groupName} accessibilityRole="header">
            {group.name}
          </Text>
          <Text style={styles.position}>{yourPosition(myBalance)}</Text>
          <Text style={styles.total}>
            {expenseCount === 0
              ? "No expenses yet."
              : `The group has spent ${formatMoney(summary.totalSpent)} across ${expenseCount} expense${expenseCount === 1 ? "" : "s"}.`}
          </Text>
          <View style={styles.actions}>
            <PillButton label="Record a payment" onPress={() => router.push({ pathname: "/record-payment", params: { groupId } })} />
            <PillButton
              label="Add expense"
              icon="add"
              primary
              onPress={() => router.push({ pathname: "/add-expense", params: { groupId } })}
            />
          </View>
        </View>

        <BalanceChart balances={summary.balances} members={members} currentUserId={currentUserId} />
        <SettleUp
          transfers={summary.transfers}
          members={members}
          currentUserId={currentUserId}
          onMarkPaid={markPaid}
          onShare={() => Share.share({ message: settleUpMessage(group) }).catch(() => {})}
        />
        <ActivityFeed
          activity={summary.activity}
          members={members}
          currentUserId={currentUserId}
          onDelete={remove}
          onEdit={(expense) => router.push({ pathname: "/add-expense", params: { groupId, expenseId: expense.id } })}
        />

        <View style={styles.footer}>
          <LinkButton label="Delete this group" danger onPress={deleteGroup} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.canvas },
    notFound: { alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
    page: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 3, gap: spacing.lg },
    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: spacing.md },
    back: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
    backText: { color: c.muted, fontSize: fontSizes.small + 1, fontWeight: "600" },
    hero: { paddingTop: spacing.xs, paddingBottom: spacing.sm },
    membersRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    memberNames: { flex: 1, color: c.muted, fontSize: fontSizes.small },
    groupName: { fontSize: fontSizes.display + 4, fontWeight: "800", color: c.ink, letterSpacing: -1.2, marginTop: spacing.lg },
    position: { fontSize: fontSizes.title + 2, fontWeight: "600", color: c.ink, marginTop: spacing.sm, letterSpacing: -0.3 },
    total: { fontSize: fontSizes.body, color: c.muted, marginTop: spacing.xs, lineHeight: 21 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.xl },
    footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingTop: spacing.lg },
  });
