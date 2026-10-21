import { StyleSheet, Text, View } from "react-native";
import { formatMoney, type Member, type MemberBalance, type UserId } from "@splitly/core";
import { fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { usePalette, useStyles } from "@/theme/usePalette";
import { Avatar } from "./Avatar";
import { Card } from "./Card";

/**
 * A diverging bar chart: the line in the middle is zero. Bars to the right
 * are money a person gets back, bars to the left are money they owe.
 */
export function BalanceChart({
  balances,
  members,
  currentUserId,
}: {
  balances: MemberBalance[];
  members: Member[];
  currentUserId: UserId;
}) {
  const c = usePalette();
  const styles = useStyles(makeStyles);
  const largest = Math.max(...balances.map((b) => Math.abs(b.balance)), 1);

  return (
    <Card title="Balances">
      <Text style={styles.hint}>Left of the line owes money. Right of the line gets money back.</Text>
      {balances.map(({ member, balance }) => {
        const isYou = member.id === currentUserId;
        const width = `${(Math.abs(balance) / largest) * 100}%` as const;
        const tone = balance > 0 ? c.owed : balance < 0 ? c.owes : c.muted;
        const label = balance === 0 ? "Settled up" : `${balance > 0 ? "Gets back" : "Owes"} ${formatMoney(Math.abs(balance))}`;

        return (
          <View key={member.id} style={styles.row} accessible accessibilityLabel={`${isYou ? "You" : member.name}: ${label}`}>
            <View style={styles.rowTop}>
              <View style={styles.who}>
                <Avatar member={member} members={members} />
                <Text style={[styles.name, isYou && styles.you]}>{isYou ? "You" : member.name}</Text>
              </View>
              <Text style={[styles.amount, { color: tone }]}>{label}</Text>
            </View>
            <View style={styles.chart}>
              <View style={[styles.half, styles.left]}>
                {balance < 0 && <View style={[styles.bar, styles.barLeft, { width, backgroundColor: c.owes }]} />}
              </View>
              <View style={styles.half}>
                {balance > 0 && <View style={[styles.bar, styles.barRight, { width, backgroundColor: c.owed }]} />}
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hint: { color: c.muted, fontSize: fontSizes.small, marginTop: spacing.xs, marginBottom: spacing.sm },
    row: { marginTop: spacing.md, gap: spacing.sm },
    rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    who: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    name: { fontSize: fontSizes.body, fontWeight: "500", color: c.ink },
    you: { fontWeight: "700" },
    amount: { fontSize: fontSizes.small + 1, fontWeight: "600", fontVariant: ["tabular-nums"] },
    chart: { flexDirection: "row", height: 22 },
    half: { flex: 1, justifyContent: "center" },
    left: { alignItems: "flex-end", borderRightWidth: 2, borderRightColor: c.ink },
    bar: { height: 10 },
    barLeft: { borderTopLeftRadius: radii.pill, borderBottomLeftRadius: radii.pill },
    barRight: { borderTopRightRadius: radii.pill, borderBottomRightRadius: radii.pill },
  });
