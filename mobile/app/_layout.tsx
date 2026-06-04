import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { colors } from "@/theme/tokens";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="emis/index" options={{ title: "EMIs" }} />
          <Stack.Screen name="cards/index" options={{ title: "Credit Cards" }} />
          <Stack.Screen name="bills/index" options={{ title: "Bills" }} />
          <Stack.Screen name="simulator" options={{ title: "Purchase Simulator" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="coach" options={{ title: "DebtOS Coach" }} />
          <Stack.Screen name="(modals)/emi-edit" options={{ presentation: "modal", title: "EMI" }} />
          <Stack.Screen name="(modals)/card-edit" options={{ presentation: "modal", title: "Credit Card" }} />
          <Stack.Screen name="(modals)/bill-edit" options={{ presentation: "modal", title: "Bill" }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
