import { Text, StyleSheet } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { NavRow } from "@/components/ui/NavRow";
import { useStore } from "@/lib/store";
import { formatCurrency, totalMonthlyEMIs, totalMonthlyBills } from "@debtos/core";
import { colors, spacing } from "@/theme/tokens";

export default function AccountsHub() {
  const { emis, cards, bills, profile } = useStore();
  return (
    <Screen>
      <Text style={styles.h1}>Accounts</Text>
      <Text style={styles.sub}>Manage your debts, cards, and recurring bills.</Text>
      <NavRow
        href="/emis"
        icon="trending-down"
        title="EMIs"
        subtitle={`${emis.length} loans · ${formatCurrency(totalMonthlyEMIs(emis), profile.currency)}/mo`}
      />
      <NavRow
        href="/cards"
        icon="credit-card"
        title="Credit Cards"
        subtitle={`${cards.length} cards`}
      />
      <NavRow
        href="/bills"
        icon="file-text"
        title="Bills"
        subtitle={`${bills.length} bills · ${formatCurrency(totalMonthlyBills(bills), profile.currency)}/mo`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.sm },
});
