import { StyleSheet, Text, View } from "react-native";
import type { Member } from "@splitly/core";
import { avatarColors, initials, type Palette } from "@splitly/theme";
import { useStyles } from "@/theme/usePalette";

/** `members` is the whole group, so each person gets a colour by their position in it. */
export function Avatar({ member, members, size = 28 }: { member: Member; members: Member[]; size?: number }) {
  const color = avatarColors(members.findIndex((m) => m.id === member.id));
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color.background }]}>
      <Text style={[styles.text, { color: color.text, fontSize: size * 0.4 }]}>{initials(member.name)}</Text>
    </View>
  );
}

export function AvatarStack({ members, size = 32 }: { members: Member[]; size?: number }) {
  const ring = useStyles(makeRingStyles);
  return (
    <View style={styles.stack}>
      {members.map((member, index) => (
        <View key={member.id} style={[ring.ring, index > 0 && styles.overlap]}>
          <Avatar member={member} members={members} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "700" },
  stack: { flexDirection: "row" },
  overlap: { marginLeft: -10 },
});

const makeRingStyles = (c: Palette) =>
  StyleSheet.create({ ring: { borderRadius: 999, borderWidth: 2, borderColor: c.canvas } });
