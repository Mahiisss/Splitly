import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatMoney, type Member, type Transfer, type UserId } from "@splitly/core";
import { fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { usePalette, useStyles } from "@/theme/usePalette";
import { Avatar } from "./Avatar";
import { Card } from "./Card";

export function SettleUp({
  transfers,
  members,
  currentUserId,
  onMarkPaid,
  onShare,
}: {
  transfers: Transfer[];
  members: Member[];
  currentUserId: UserId;
  onMarkPaid: (transfer: Transfer) => void;
  onShare: () => void;
}) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const byId = new Map(members.map((m) => [m.id, m]));
  const name = (id: UserId, capital = true) =>
    id === currentUserId ? (capital ? "You" : "you") : (byId.get(id)?.name ?? id);

  const share =
    transfers.length > 0 ? (
      <Pressable accessibilityRole="button" onPress={onShare} style={styles.pill} hitSlop={6}>
        <Ionicons name="share-social-outline" size={14} color={c.onPanel} />
        <Text style={styles.pillText}>Share</Text>
      </Pressable>
    ) : null;

  return (
    <Card title="Settle up" panel action={share}>
      <Text style={styles.subtitle}>
        {transfers.length === 0
          ? "Everyone is square. Nothing to pay."
          : `${transfers.length} payment${transfers.length === 1 ? "" : "s"} clear every balance in the group.`}
      </Text>
      {transfers.map((t) => {
        const from = byId.get(t.from);
        const to = byId.get(t.to);
        const involvesYou = t.from === currentUserId || t.to === currentUserId;
        const sentence = `${name(t.from)} ${t.from === currentUserId ? "pay" : "pays"} ${name(t.to, false)}`;
        return (
          <View key={`${t.from}-${t.to}`} style={[styles.item, involvesYou && styles.yours]}>
            <View style={styles.people}>
              {from && <Avatar member={from} members={members} size={26} />}
              <Ionicons name="arrow-forward" size={14} color={c.onPanel} style={styles.arrow} />
              {to && <Avatar member={to} members={members} size={26} />}
              <Text style={styles.who}>{sentence}</Text>
            </View>
            <View style={styles.bottom}>
              <Text style={styles.amount}>{formatMoney(t.amount)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mark as paid: ${sentence} ${formatMoney(t.amount)}`}
                onPress={() => onMarkPaid(t)}
                style={({ pressed }) => [styles.pill, pressed && { borderColor: c.onPanel }]}
              >
                <Ionicons name="checkmark" size={14} color={c.onPanel} />
                <Text style={styles.pillText}>Mark as paid</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    subtitle: { color: c.onPanel, opacity: 0.9, fontSize: fontSizes.small, marginTop: spacing.xs, marginBottom: spacing.sm },
    item: {
      backgroundColor: c.panelRaised,
      borderRadius: radii.md,
      padding: spacing.md + 2,
      marginTop: spacing.sm + 2,
      borderWidth: 1,
      borderColor: c.panelRaised,
    },
    yours: { borderColor: c.highlight },
    people: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
    arrow: { opacity: 0.5 },
    who: { color: c.onPanel, opacity: 0.85, fontSize: fontSizes.small + 1, marginLeft: spacing.xs },
    bottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 32,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: `${c.onPanel}4D`, // 30% opacity
    },
    pillText: { color: c.onPanel, fontSize: fontSizes.caption, fontWeight: "700" },
    amount: {
      color: c.onPanel,
      fontSize: fontSizes.headline - 4,
      fontWeight: "700",
      marginTop: spacing.sm + 2,
      fontVariant: ["tabular-nums"],
      letterSpacing: -0.4,
    },
  });
