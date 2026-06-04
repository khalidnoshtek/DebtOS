import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Progress } from "@/components/ui/Progress";
import { Fab } from "@/components/ui/Fab";
import { useStore } from "@/lib/store";
import {
  totalMonthlyEMIs,
  remainingPrincipal,
  remainingTenure,
  totalInterestRemaining,
  emiEndDate,
  formatCurrency,
  monthsToHuman,
} from "@debtos/core";
import { categoryLabel, EMI_CATEGORIES } from "@/lib/options";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export default function EmisScreen() {
  const router = useRouter();
  const { emis, profile } = useStore();

  const monthly = totalMonthlyEMIs(emis);
  const outstanding = emis.reduce((s, e) => s + remainingPrincipal(e), 0);
  const interest = emis.reduce((s, e) => s + totalInterestRemaining(e), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <View style={styles.tiles}>
          <StatTile label="Monthly EMIs" value={formatCurrency(monthly, profile.currency)} hint={`${emis.length} loans`} />
          <StatTile label="Outstanding" value={formatCurrency(outstanding, profile.currency)} />
          <StatTile label="Interest left" value={formatCurrency(interest, profile.currency)} />
        </View>

        {emis.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No EMIs yet. Tap + to add one, or seed demo data from Home.</Text>
          </Card>
        ) : (
          emis.map((e) => {
            const paidPct = e.tenureMonths > 0 ? (e.monthsPaid / e.tenureMonths) * 100 : 0;
            return (
              <Pressable key={e.id} onPress={() => router.push(`/(modals)/emi-edit?id=${e.id}`)}>
                <Card>
                  <View style={styles.rowBetween}>
                    <Text style={styles.name}>{e.name}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{categoryLabel(EMI_CATEGORIES, e.category)}</Text>
                    </View>
                  </View>
                  <View style={styles.grid}>
                    <Mini label="Monthly" value={formatCurrency(e.monthlyAmount, profile.currency)} />
                    <Mini label="Remaining" value={formatCurrency(remainingPrincipal(e), profile.currency)} />
                    <Mini label="Tenure left" value={monthsToHuman(remainingTenure(e))} />
                    <Mini label="Rate" value={`${e.interestRate}%`} />
                  </View>
                  <Progress value={paidPct} />
                  <Text style={styles.sub}>
                    {Math.round(paidPct)}% paid · ends {emiEndDate(e).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </Text>
                </Card>
              </Pressable>
            );
          })
        )}
      </Screen>
      <Fab onPress={() => router.push("/(modals)/emi-edit")} />
    </View>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: colors.text, fontSize: 16, fontWeight: "600", flex: 1 },
  badge: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { color: colors.accent, fontSize: 11, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginVertical: spacing.sm },
  mini: { width: "50%", paddingVertical: spacing.xs },
  miniLabel: { color: colors.textMuted, fontSize: 11 },
  miniValue: { color: colors.text, fontSize: 14, fontWeight: "600", ...typography.tabular },
  sub: { color: colors.textFaint, fontSize: 12, marginTop: spacing.xs },
});
