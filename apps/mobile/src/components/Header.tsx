import { StyleSheet, Text, View } from "react-native";
import { currentUser } from "@splitly/core";
import { fontSizes, spacing, type Palette } from "@splitly/theme";
import { useStyles } from "@/theme/usePalette";
import { Avatar } from "./Avatar";

/** The logo and your avatar, at the top of the main screens. */
export function Header() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.topBar}>
      <View style={styles.logo}>
        {/* A coin cut in two, the halves pulled apart: one bill, split. */}
        <View style={[styles.half, styles.leftHalf]} />
        <View style={[styles.half, styles.rightHalf]} />
        <Text style={styles.logoText}>Splitly</Text>
      </View>
      <Avatar member={currentUser} members={[currentUser]} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.md },
    logo: { flexDirection: "row", alignItems: "center" },
    half: { width: 9, height: 18 },
    leftHalf: { backgroundColor: c.primary, borderTopLeftRadius: 9, borderBottomLeftRadius: 9, transform: [{ translateY: -1.5 }] },
    rightHalf: {
      backgroundColor: c.primary,
      borderTopRightRadius: 9,
      borderBottomRightRadius: 9,
      marginLeft: 2,
      transform: [{ translateY: 1.5 }],
    },
    logoText: { fontSize: fontSizes.title - 2, fontWeight: "700", color: c.ink, marginLeft: spacing.sm, letterSpacing: -0.3 },
  });
