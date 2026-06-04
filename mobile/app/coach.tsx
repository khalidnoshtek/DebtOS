import { Text, StyleSheet } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { colors } from "@/theme/tokens";

// Placeholder — built out in a later phase.
export default function CoachScreen() {
  return (
    <Screen>
      <Text style={styles.h1}>DebtOS Coach</Text>
      <Text style={styles.sub}>Coming next.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 26, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14 },
});
