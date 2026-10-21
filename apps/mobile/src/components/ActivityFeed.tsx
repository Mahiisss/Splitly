import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  expenseImpact,
  formatMoney,
  groupByDay,
  type ActivityItem,
  type Expense,
  type ExpenseCategory,
  type Member,
  type UserId,
} from "@splitly/core";
import { categoryStyles, fontSizes, radii, spacing, type Palette } from "@splitly/theme";
import { usePalette, useStyles, useThemeName } from "@/theme/usePalette";
import { Card } from "./Card";

type IconName = ComponentProps<typeof Ionicons>["name"];

export const categoryIcons: Record<ExpenseCategory, IconName> = {
  stay: "bed-outline",
  travel: "bicycle-outline",
  food: "restaurant-outline",
  groceries: "basket-outline",
  fun: "sparkles-outline",
  rent: "home-outline",
  bills: "flash-outline",
  other: "receipt-outline",
};

function Tile({ icon, background, foreground }: { icon: IconName; background: string; foreground: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.tile, { backgroundColor: background }]}>
      <Ionicons name={icon} size={20} color={foreground} />
    </View>
  );
}

export function ActivityFeed({
  activity,
  members,
  currentUserId,
  onDelete,
  onEdit,
}: {
  activity: ActivityItem[];
  members: Member[];
  currentUserId: UserId;
  onDelete: (item: ActivityItem) => void;
  onEdit: (expense: Expense) => void;
}) {
  const c = usePalette();
  const mode = useThemeName();
  const styles = useStyles(makeStyles);
  const name = (id: UserId) => (id === currentUserId ? "You" : (members.find((m) => m.id === id)?.name ?? id));
  const titleOf = (item: ActivityItem) =>
    item.kind === "expense"
      ? item.expense.description
      : `${name(item.settlement.from)} paid ${name(item.settlement.to).replace(/^You$/, "you")}`;

  return (
    <Card title="Activity">
      {activity.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.title}>No expenses yet.</Text>
          <Text style={[styles.sub, styles.center]}>Add the first one and Splitly works out who owes what.</Text>
        </View>
      )}
      {groupByDay(activity).map(({ day, items }) => (
        <View key={day} style={styles.day}>
          <Text style={styles.dayLabel}>{day}</Text>
          {items.map((item, index) => {
            const title = titleOf(item);
            return (
              <View key={item.id} style={[styles.row, index > 0 && styles.divider]}>
                {item.kind === "expense" ? (
                  (() => {
                    const { expense } = item;
                    const tone = categoryStyles[expense.category]![mode];
                    const impact = expenseImpact(expense, currentUserId);
                    return (
                      <>
                        <Tile icon={categoryIcons[expense.category]} background={tone.background} foreground={tone.foreground} />
                        <View style={styles.flex}>
                          <Text style={styles.title} numberOfLines={1}>
                            {expense.description}
                          </Text>
                          <Text style={styles.sub}>
                            {name(expense.paidBy)} paid {formatMoney(expense.amount)}
                          </Text>
                          {/* Under the name rather than in its own column, so names fit on narrow phones. */}
                          <Text
                            style={[
                              styles.impact,
                              { color: impact.kind === "lent" ? c.owed : impact.kind === "borrowed" ? c.owes : c.muted },
                            ]}
                          >
                            {impact.kind === "none"
                              ? "Not involved"
                              : `${impact.kind === "lent" ? "You lent" : "You borrowed"} ${formatMoney(impact.amount)}`}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${title}`}
                          hitSlop={8}
                          onPress={() => onEdit(expense)}
                          style={styles.iconButton}
                        >
                          <Ionicons name="create-outline" size={17} color={c.muted} />
                        </Pressable>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <Tile icon="cash-outline" background={c.owedSoft} foreground={c.owed} />
                    <View style={styles.flex}>
                      <Text style={styles.title} numberOfLines={1}>
                        {title}
                      </Text>
                      <Text style={styles.sub}>Recorded payment</Text>
                    </View>
                    <Text style={[styles.amount, { color: c.owed }]}>{formatMoney(item.settlement.amount)}</Text>
                  </>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${title}`}
                  hitSlop={8}
                  onPress={() => onDelete(item)}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={17} color={c.muted} />
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    day: { marginTop: spacing.lg },
    dayLabel: { fontSize: fontSizes.small, color: c.muted, fontWeight: "500", marginBottom: spacing.xs },
    row: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, paddingVertical: spacing.md },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    tile: { width: 42, height: 42, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
    flex: { flex: 1 },
    title: { fontSize: fontSizes.body, fontWeight: "600", color: c.ink },
    sub: { fontSize: fontSizes.small, color: c.muted, marginTop: 2 },
    center: { textAlign: "center" },
    impact: { fontSize: fontSizes.small, fontWeight: "600", marginTop: 2, fontVariant: ["tabular-nums"] },
    amount: { fontSize: fontSizes.body, fontWeight: "600", fontVariant: ["tabular-nums"] },
    iconButton: { padding: 2 },
    empty: {
      marginTop: spacing.lg,
      padding: spacing.xl,
      borderRadius: radii.md,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.line,
      alignItems: "center",
      gap: spacing.xs,
    },
  });
