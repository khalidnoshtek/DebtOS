import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Fab } from "@/components/ui/Fab";
import { useStore } from "@/lib/store";
import { totalMonthlyBills, formatCurrency, formatPercent } from "@debtos/core";
import { BILL_CATEGORIES, categoryLabel } from "@/lib/options";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function BillsScreen() {
  const router = useRouter();
  const { bills, profile } = useStore();
  const total = totalMonthlyBills(bills);
  const pctOfSalary = profile.monthlySalary > 0 ? (total / profile.monthlySalary) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <View style={styles.tiles}>
          <StatTile label="Monthly bills" value={formatCurrency(total, profile.currency)} />
          <StatTile label="Tracked" value={String(bills.length)} />
          <StatTile label="% of salary" value={formatPercent(pctOfSalary)} />
        </View>

        {bills.length === 0 ? (
          <Card><Text style={styles.empty}>No bills yet. Tap + to add one.</Text></Card>
        ) : (
          bills
            .slice()
            .sort((a, b) => a.dueDay - b.dueDay)
            .map((b) => (
              <Pressable key={b.id} onPress={() => router.push(`/(modals)/bill-edit?id=${b.id}`)}>
                <Card>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{b.name}</Text>
                      <View style={styles.metaRow}>
                        <View style={styles.badge}><Text style={styles.badgeText}>{categoryLabel(BILL_CATEGORIES, b.category)}</Text></View>
                        <Feather name="calendar" size={12} color={colors.textFaint} />
                        <Text style={styles.due}>Day {b.dueDay}</Text>
                      </View>
                    </View>
                    <Text style={styles.amount}>{formatCurrency(b.amount, profile.currency)}</Text>
                  </View>
                </Card>
              </Pressable>
            ))
        )}
      </Screen>
      <Fab onPress={() => router.push("/(modals)/bill-edit")} />
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  badge: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { color: colors.accent, fontSize: 11, fontWeight: "600" },
  due: { color: colors.textFaint, fontSize: 12 },
  amount: { color: colors.text, fontSize: 18, fontWeight: "700", ...typography.tabular },
});
