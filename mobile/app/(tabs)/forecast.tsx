import { Text, StyleSheet } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { colors } from "@/theme/tokens";

// Placeholder — real forecast charts land in Phase 3.
export default function ForecastScreen() {
  return (
    <Screen>
      <Text style={styles.h1}>Forecast</Text>
      <Text style={styles.sub}>Multi-horizon balance projection — coming next.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14 },
});
