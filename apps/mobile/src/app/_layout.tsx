import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { Toast } from "@/components/Toast";
import { AppProvider } from "@/state/AppProvider";
import { usePalette, useThemeName } from "@/theme/usePalette";

export default function RootLayout() {
  return (
    <AppProvider>
      <Screens />
    </AppProvider>
  );
}

function Screens() {
  const c = usePalette();
  const mode = useThemeName();
  const modal = {
    presentation: "modal",
    headerShown: true,
    headerStyle: { backgroundColor: c.canvas },
    headerTintColor: c.ink,
    headerShadowVisible: false,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="add-expense" options={{ ...modal, title: "Add an expense" }} />
        <Stack.Screen name="record-payment" options={{ ...modal, title: "Record a payment" }} />
        <Stack.Screen name="new-group" options={{ ...modal, title: "New group" }} />
        <Stack.Screen name="edit-group" options={{ ...modal, title: "Edit group" }} />
      </Stack>
      <Toast />
    </View>
  );
}
