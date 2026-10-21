import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { currentUserId, formatMoney, sampleAppState, yourBalance, type Group } from "@splitly/core";
import { fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { AvatarStack } from "@/components/Avatar";
import { LinkButton, PillButton } from "@/components/Buttons";
import { Header } from "@/components/Header";
import { useApp } from "@/state/AppProvider";
import { usePalette, useStyles } from "@/theme/usePalette";

function overallSentence(total: number, groupCount: number): string {
  if (groupCount === 0) return "Create a group for your next trip, your flat or office lunches.";
  if (total > 0) return `Overall, you get back ${formatMoney(total)}.`;
  if (total < 0) return `Overall, you owe ${formatMoney(-total)}.`;
  return "You're settled up everywhere.";
}

/** Home: every group, with your balance in each. */
export default function HomeScreen() {
  const { app, loaded, dispatch, showToast } = useApp();
  const c = usePalette();
  const styles = useStyles(makeStyles);

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={c.muted} />
      </SafeAreaView>
    );
  }

  const balances = app.groups.map((g) => yourBalance(g, currentUserId));
  const total = balances.reduce((sum, b) => sum + b, 0);

  function resetSampleData() {
    const previous = app;
    dispatch({ type: "replace", state: sampleAppState });
    showToast({ message: "Sample data restored.", onUndo: () => dispatch({ type: "replace", state: previous }) });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.page}>
        <Header />
        <View style={styles.hero}>
          <Text style={styles.title} accessibilityRole="header">
            Your groups
          </Text>
          <Text style={styles.position}>{overallSentence(total, app.groups.length)}</Text>
          <View style={styles.actions}>
            <PillButton label="New group" icon="add" primary onPress={() => router.push("/new-group")} />
          </View>
        </View>

        {app.groups.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.cardTitle}>No groups yet.</Text>
            <Text style={styles.muted}>Groups keep each trip, flat or hobby&apos;s expenses separate.</Text>
          </View>
        )}

        {app.groups.map((group, index) => (
          <GroupCard key={group.id} group={group} balance={balances[index] ?? 0} />
        ))}

        <View style={styles.footer}>
          <Text style={styles.muted}>Your groups are saved on this phone.</Text>
          <LinkButton label="Reset to sample data" onPress={resetSampleData} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GroupCard({ group, balance }: { group: Group; balance: number }) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const spent = group.expenses.reduce((sum, e) => sum + e.amount, 0);
  const status =
    balance > 0
      ? { text: `You get back ${formatMoney(balance)}`, color: c.owed }
      : balance < 0
        ? { text: `You owe ${formatMoney(-balance)}`, color: c.owes }
        : { text: "Settled up", color: c.muted };

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${group.name}. ${status.text}`}
      onPress={() => router.push({ pathname: "/group/[id]", params: { id: group.id } })}
      style={({ pressed }) => [styles.card, pressed && { borderColor: c.muted }]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {group.name}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={c.muted} />
      </View>
      <View style={styles.membersRow}>
        <AvatarStack members={group.members} size={28} />
        <Text style={styles.muted}>
          {group.members.length} {group.members.length === 1 ? "person" : "people"}
        </Text>
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.status, { color: status.color }]}>{status.text}</Text>
        <Text style={styles.muted}>
          {group.expenses.length === 0 ? "No expenses yet" : `${formatMoney(spent)} spent`}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.canvas },
    center: { alignItems: "center", justifyContent: "center" },
    page: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 3, gap: spacing.lg },
    hero: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
    title: { fontSize: fontSizes.display, fontWeight: "800", color: c.ink, letterSpacing: -1.2 },
    position: { fontSize: fontSizes.title + 2, fontWeight: "600", color: c.ink, marginTop: spacing.sm, letterSpacing: -0.3 },
    actions: { flexDirection: "row", marginTop: spacing.xl },
    card: {
      backgroundColor: c.surface,
      borderColor: c.line,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.lg + 2,
      gap: spacing.md,
    },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
    cardTitle: { flex: 1, fontSize: fontSizes.title + 2, fontWeight: "700", color: c.ink, letterSpacing: -0.4 },
    membersRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    cardBottom: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
      paddingTop: spacing.md,
    },
    status: { fontSize: fontSizes.body, fontWeight: "700" },
    muted: { color: c.muted, fontSize: fontSizes.small },
    empty: {
      padding: spacing.xl,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.line,
      alignItems: "center",
      gap: spacing.xs,
    },
    footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingTop: spacing.lg, gap: spacing.xs },
  });
