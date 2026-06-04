import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import {
  stressScore,
  stressBand,
  stressLabel,
  totalMonthlyEMIs,
  totalCardUtilization,
  totalDebt,
  remainingPrincipal,
  formatCurrency,
  formatPercent,
} from "@debtos/core";
import { colors, radius, spacing, stressTokens, typography } from "@/theme/tokens";

export default function StressScreen() {
  const router = useRouter();
  const { profile, emis, cards } = useStore();

  const hasIncome = profile.monthlySalary > 0;
  const monthlyEmis = totalMonthlyEMIs(emis);
  const debt = totalDebt(emis, cards);
  const util = totalCardUtilization(cards);
  const emiRatio = hasIncome ? (monthlyEmis / profile.monthlySalary) * 100 : 0;
  const savings = hasIncome ? (profile.emergencyFund + profile.currentBalance) / profile.monthlySalary : 0;

  if (!hasIncome) {
    return (
      <Screen>
        <Text style={styles.h1}>Financial Stress Engine</Text>
        <Card style={{ borderColor: stressTokens("warning").border, backgroundColor: stressTokens("warning").bg }}>
          <Text style={styles.cardTitle}>Set your monthly salary to compute stress</Text>
          <Text style={styles.muted}>
            The stress engine compares your EMIs, debt, and savings to your income. Without a salary it can&apos;t
            produce a meaningful score.
          </Text>
          <Button title="Set salary in Settings" onPress={() => router.push("/settings")} style={{ marginTop: spacing.md }} />
        </Card>
      </Screen>
    );
  }

  const score = stressScore(profile, emis, cards);
  const band = stressBand(score);
  const tone = stressTokens(band);
  const debtIncomeRatio = (debt / (profile.monthlySalary * 12)) * 100;

  const drivers = [
    { label: "EMI / Income ratio", value: formatPercent(emiRatio), pct: Math.min(100, emiRatio * 2), healthy: "< 40%", danger: emiRatio > 50 },
    { label: "Debt / Annual income", value: formatPercent(debtIncomeRatio), pct: Math.min(100, debtIncomeRatio), healthy: "< 100%", danger: debtIncomeRatio > 100 },
    { label: "Card utilization", value: formatPercent(util), pct: util, healthy: "< 30%", danger: util > 50 },
    { label: "Savings (months)", value: `${savings.toFixed(1)} mo`, pct: Math.min(100, (savings / 6) * 100), healthy: "6+ months", danger: savings < 3 },
  ];

  const recs = buildRecommendations({ emiRatio, util, savings, emis, currency: profile.currency });

  return (
    <Screen>
      <Text style={styles.h1}>Stress Engine</Text>

      <Card style={{ borderColor: tone.border, backgroundColor: tone.bg, alignItems: "center" }}>
        <Text style={[styles.score, { color: tone.fg }]}>{score}</Text>
        <Text style={styles.band}>{stressLabel(band)}</Text>
        <View style={{ width: "100%", marginTop: spacing.md }}>
          <Progress value={score} color={tone.fg} />
        </View>
        <View style={styles.zones}>
          {[
            { label: "Stable", range: "0–29", b: "stable" },
            { label: "Warning", range: "30–54", b: "warning" },
            { label: "Danger", range: "55–79", b: "dangerous" },
            { label: "Critical", range: "80+", b: "critical" },
          ].map((z) => (
            <View key={z.label} style={[styles.zone, band === z.b && { borderColor: tone.fg, backgroundColor: tone.bg }]}>
              <Text style={[styles.zoneLabel, band === z.b && { color: tone.fg }]}>{z.label}</Text>
              <Text style={styles.zoneRange}>{z.range}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Drivers</Text>
        {drivers.map((d) => (
          <View key={d.label} style={styles.driver}>
            <View style={styles.driverRow}>
              <Text style={styles.driverLabel}>{d.label}</Text>
              <Text style={[styles.driverValue, d.danger && { color: colors.negative }]}>{d.value}</Text>
            </View>
            <Progress value={d.pct} color={d.danger ? colors.negative : colors.accent} />
            <Text style={styles.healthy}>Healthy: {d.healthy}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Recommendations</Text>
        {recs.map((r, i) => (
          <View key={i} style={styles.rec}>
            <Feather name={r.icon} size={18} color={r.danger ? colors.negative : colors.positive} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recTitle}>{r.title}</Text>
              <Text style={styles.muted}>{r.body}</Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function buildRecommendations({
  emiRatio,
  util,
  savings,
  emis,
  currency,
}: {
  emiRatio: number;
  util: number;
  savings: number;
  emis: ReturnType<typeof useStore.getState>["emis"];
  currency: string;
}) {
  const recs: { title: string; body: string; icon: keyof typeof Feather.glyphMap; danger?: boolean }[] = [];
  if (emiRatio > 50)
    recs.push({ icon: "alert-triangle", danger: true, title: "EMI burden exceeds healthy threshold", body: `Your EMIs consume ${emiRatio.toFixed(0)}% of monthly income. Above 40% leaves dangerously thin margins. Avoid new EMIs until this drops.` });
  if (util > 50)
    recs.push({ icon: "alert-triangle", danger: true, title: "High credit card utilization", body: `Carrying ${util.toFixed(0)}% utilization signals stress to bureaus and racks up revolving interest. Pay down before the statement closes.` });
  if (savings < 3)
    recs.push({ icon: "shield", title: "Build emergency runway", body: "You have less than 3 months of expenses saved. Aim for 6 months before considering any new EMI." });
  const highRate = emis.filter((e) => e.interestRate > 14 && remainingPrincipal(e) > 0).sort((a, b) => b.interestRate - a.interestRate)[0];
  if (highRate)
    recs.push({ icon: "trending-up", title: `Prioritize ${highRate.name}`, body: `At ${highRate.interestRate}% interest, this is your most expensive debt. Closing it early frees ${formatCurrency(highRate.monthlyAmount, currency)}/mo.` });
  if (recs.length === 0)
    recs.push({ icon: "shield", title: "You're in good shape", body: "Maintain current trajectory. Channel surplus into investments or accelerated debt payoff to compound your runway." });
  return recs;
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  cardTitle: { ...typography.heading },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  score: { fontSize: 72, fontWeight: "700", ...typography.tabular },
  band: { color: colors.text, fontSize: 18, fontWeight: "600", marginTop: -spacing.xs },
  zones: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md, width: "100%" },
  zone: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  zoneLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  zoneRange: { color: colors.textFaint, fontSize: 10 },
  driver: { gap: spacing.xs, marginTop: spacing.md },
  driverRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  driverLabel: { color: colors.text, fontSize: 14 },
  driverValue: { color: colors.text, fontSize: 14, fontWeight: "700", ...typography.tabular },
  healthy: { color: colors.textFaint, fontSize: 11 },
  rec: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  recTitle: { color: colors.text, fontSize: 14, fontWeight: "600", marginBottom: 2 },
});
