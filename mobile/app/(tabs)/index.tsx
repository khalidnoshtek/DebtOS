import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AreaChart } from "@/components/ui/AreaChart";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { useStore } from "@/lib/store";
import {
  safeToSpend,
  totalMonthlyEMIs,
  totalMonthlyBills,
  dailyBurnRate,
  emergencyRunwayDays,
  totalDebt,
  debtFreedomDate,
  stressScore,
  stressBand,
  stressLabel,
  forecast,
  formatCurrency,
} from "@debtos/core";
import { colors, spacing, stressTokens, typography } from "@/theme/tokens";

export default function Dashboard() {
  const router = useRouter();
  const { profile, emis, cards, bills, seedDemo } = useStore();

  const isEmpty = profile.monthlySalary === 0 && emis.length === 0 && cards.length === 0;

  if (isEmpty) {
    return (
      <Screen>
        <Text style={styles.brand}>DebtOS</Text>
        <Text style={styles.tagline}>Predict your financial future.</Text>
        <Card>
          <Text style={styles.cardTitle}>Get started</Text>
          <Text style={styles.muted}>1. Set your monthly salary in Settings.</Text>
          <Text style={styles.muted}>2. Add your EMIs, bills, and credit cards.</Text>
          <Text style={styles.muted}>3. See your forecast, stress score, and runway.</Text>
          <Button title="Try demo data" onPress={seedDemo} style={{ marginTop: spacing.md }} />
          <Button title="Go to Settings" variant="secondary" onPress={() => router.push("/settings")} />
        </Card>
      </Screen>
    );
  }

  const safe = safeToSpend(profile, emis, bills, cards);
  const monthlyEmi = totalMonthlyEMIs(emis);
  const monthlyBills = totalMonthlyBills(bills);
  const cardMin = cards.reduce((s, c) => s + c.minDue, 0);
  const burn = dailyBurnRate(profile, emis, bills, cards);
  const runway = emergencyRunwayDays(profile, emis, bills, cards);
  const debt = totalDebt(emis, cards);
  const score = stressScore(profile, emis, cards);
  const band = stressBand(score);
  const tone = stressTokens(band);
  const freedom = debtFreedomDate(emis);

  const points = forecast(profile, emis, bills, cards, 12);
  const chartValues = points.map((p) => p.balance);
  const chartLabels = points.map((p, i) => (i % 3 === 0 ? new Date(p.date).toLocaleDateString("en-IN", { month: "short" }) : ""));
  const endNeg = (points[points.length - 1]?.balance ?? 0) < 0;
  const lineColor = endNeg ? colors.negative : colors.accent;

  const obligations = [
    { label: "Salary (in)", value: profile.monthlySalary, sign: "+" },
    { label: "EMIs", value: monthlyEmi, sign: "−" },
    { label: "Bills", value: monthlyBills, sign: "−" },
    { label: "Card min dues", value: cardMin, sign: "−" },
    { label: "Variable spend", value: profile.monthlyVariableSpend, sign: "−" },
  ];

  return (
    <Screen>
      <Text style={styles.brand}>DebtOS</Text>

      <View style={styles.tiles}>
        <StatTile label="Safe to spend" value={formatCurrency(safe, profile.currency)} hint="this month" tone={colors.positive} />
        <StatTile label="Monthly EMIs" value={formatCurrency(monthlyEmi, profile.currency)} hint={`${emis.length} loans`} />
        <StatTile label="Daily burn" value={formatCurrency(burn, profile.currency)} />
        <StatTile label="Runway" value={runway === Infinity ? "∞" : `${runway} days`} tone={runway < 30 ? colors.negative : undefined} />
      </View>

      <Card style={{ borderColor: tone.border, backgroundColor: tone.bg }}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Financial stress</Text>
          <Text style={[styles.scoreInline, { color: tone.fg }]}>{score} · {stressLabel(band)}</Text>
        </View>
        <Progress value={score} color={tone.fg} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>12-month forecast</Text>
        <View style={{ marginTop: spacing.md }}>
          <AreaChart
            values={chartValues}
            labels={chartLabels}
            height={170}
            color={lineColor}
            formatY={(v) => formatCurrency(v, profile.currency, true)}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Income & obligations</Text>
        {obligations.map((o) => (
          <View key={o.label} style={styles.obRow}>
            <Text style={styles.obLabel}>{o.label}</Text>
            <Text style={[styles.obValue, o.sign === "+" ? { color: colors.positive } : null]}>
              {o.sign} {formatCurrency(o.value, profile.currency)}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Debt freedom</Text>
        <View style={styles.obRow}>
          <Text style={styles.obLabel}>Total debt</Text>
          <Text style={styles.obValue}>{formatCurrency(debt, profile.currency)}</Text>
        </View>
        <View style={styles.obRow}>
          <Text style={styles.obLabel}>Debt-free by</Text>
          <Text style={styles.obValue}>
            {emis.length ? freedom.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—"}
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { color: colors.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.sm },
  cardTitle: { ...typography.heading },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  scoreInline: { fontSize: 15, fontWeight: "700", ...typography.tabular },
  obRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  obLabel: { color: colors.textMuted, fontSize: 14 },
  obValue: { color: colors.text, fontSize: 15, fontWeight: "600", ...typography.tabular },
});
