import { Text, StyleSheet } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { colors } from "@/theme/tokens";

// Placeholder — real stress engine lands in Phase 3.
export default function StressScreen() {
  return (
    <Screen>
      <Text style={styles.h1}>Stress Engine</Text>
      <Text style={styles.sub}>Composite financial-stress score — coming next.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14 },
});
