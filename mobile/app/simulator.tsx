import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { useStore } from "@/lib/store";
import {
  simulatePurchase,
  stressBand,
  stressLabel,
  formatCurrency,
  monthsToHuman,
} from "@debtos/core";
import { colors, radius, spacing, stressTokens, typography } from "@/theme/tokens";

export default function SimulatorScreen() {
  const { profile, emis, cards } = useStore();
  const [price, setPrice] = useState("150000");
  const [down, setDown] = useState("0");
  const [tenure, setTenure] = useState("18");
  const [rate, setRate] = useState("14");

  const num = (s: string) => Number(s) || 0;
  const result = simulatePurchase(profile, emis, cards, {
    price: num(price),
    downPayment: num(down),
    tenureMonths: num(tenure),
    interestRate: num(rate),
  });

  const beforeBand = stressBand(result.beforeScore);
  const afterBand = stressBand(result.afterScore);

  return (
    <Screen>
      <Card>
        <Text style={styles.cardTitle}>What are you buying?</Text>
        <Field label="Price" value={price} onChangeText={setPrice} numeric />
        <Field label="Down payment" value={down} onChangeText={setDown} numeric />
        <View style={styles.row}>
          <View style={styles.col}>
            <Field label="Tenure (months)" value={tenure} onChangeText={setTenure} numeric />
          </View>
          <View style={styles.col}>
            <Field label="Interest % p.a." value={rate} onChangeText={setRate} numeric />
          </View>
        </View>
        <View style={styles.emiBox}>
          <Text style={styles.emiLabel}>Monthly EMI</Text>
          <Text style={styles.emiValue}>{formatCurrency(result.monthlyEMI, profile.currency)}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Impact on your finances</Text>

        <Text style={styles.metricLabel}>Stress shift</Text>
        <View style={styles.shiftRow}>
          <Badge text={`${result.beforeScore} · ${stressLabel(beforeBand)}`} tone={stressTokens(beforeBand)} />
          <Text style={styles.arrow}>→</Text>
          <Badge text={`${result.afterScore} · ${stressLabel(afterBand)}`} tone={stressTokens(afterBand)} />
        </View>

        <Metric label="Cashflow reduction" value={`${formatCurrency(result.cashflowReduction, profile.currency)}/mo`} />
        <Metric label="Debt-freedom delay" value={result.debtFreedomDelayMonths > 0 ? monthsToHuman(result.debtFreedomDelayMonths) : "None"} />
        <Metric label="Total interest paid" value={formatCurrency(result.totalInterest, profile.currency)} />
        <Metric label="Total cost" value={formatCurrency(result.totalCost, profile.currency)} />
      </Card>

      {result.stressIncrease >= 10 ? (
        <Card style={{ borderColor: stressTokens("dangerous").border, backgroundColor: stressTokens("dangerous").bg }}>
          <Text style={styles.cardTitle}>Think twice</Text>
          <Text style={styles.muted}>
            This purchase pushes your stress score up by {result.stressIncrease} points. Consider a larger down
            payment, a shorter tenure, or delaying until existing EMIs close.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function Badge({ text, tone }: { text: string; tone: { fg: string; bg: string; border: string } }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.badgeText, { color: tone.fg }]}>{text}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typography.heading, marginBottom: spacing.xs },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: "row", gap: spacing.md },
  col: { flex: 1 },
  emiBox: { marginTop: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing.md },
  emiLabel: { color: colors.textMuted, fontSize: 12 },
  emiValue: { color: colors.text, fontSize: 24, fontWeight: "700", ...typography.tabular },
  metricLabel: { color: colors.textMuted, fontSize: 13 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  metricValue: { color: colors.text, fontSize: 15, fontWeight: "600", ...typography.tabular },
  shiftRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.sm },
  arrow: { color: colors.textMuted, fontSize: 18 },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
  badgeText: { fontSize: 13, fontWeight: "600", ...typography.tabular },
});
