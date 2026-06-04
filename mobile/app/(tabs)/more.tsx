import { Text, StyleSheet } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { NavRow } from "@/components/ui/NavRow";
import { colors, spacing } from "@/theme/tokens";

export default function MoreHub() {
  return (
    <Screen>
      <Text style={styles.h1}>More</Text>
      <Text style={styles.sub}>Tools and settings.</Text>
      <NavRow href="/simulator" icon="shopping-bag" title="Purchase Simulator" subtitle="Pre-purchase stress impact" />
      <NavRow href="/coach" icon="message-circle" title="DebtOS Coach" subtitle="On-device AI guidance" />
      <NavRow href="/settings" icon="settings" title="Settings" subtitle="Profile, backup & restore" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.sm },
});
