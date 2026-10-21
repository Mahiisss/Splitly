import { StyleSheet, Text, View } from "react-native";
import { demoCurrentUser } from "@splitly/core";
import { fontSizes, spacing, type Palette } from "@splitly/theme";
import { useStyles } from "@/theme/usePalette";
import { Avatar } from "./Avatar";

/** The logo and your avatar, at the top of the main screens. */
export function Header() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.topBar}>
      <View style={styles.logo}>
        <View style={[styles.coin, styles.coinBack]} />
        <View style={[styles.coin, styles.coinFront]} />
        <Text style={styles.logoText}>Splitly</Text>
      </View>
      <Avatar member={demoCurrentUser} members={[demoCurrentUser]} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.md },
    logo: { flexDirection: "row", alignItems: "center" },
    coin: { width: 18, height: 18, borderRadius: 9 },
    coinBack: { backgroundColor: c.ink },
    coinFront: { backgroundColor: c.marigold, marginLeft: -8, opacity: 0.92 },
    logoText: { fontSize: fontSizes.title - 2, fontWeight: "700", color: c.ink, marginLeft: spacing.sm, letterSpacing: -0.3 },
  });
