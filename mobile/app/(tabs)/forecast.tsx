import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AreaChart } from "@/components/ui/AreaChart";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Segmented } from "@/components/ui/Segmented";
import { useStore } from "@/lib/store";
import { forecast, formatCurrency, type Profile } from "@debtos/core";
import { colors, spacing, typography } from "@/theme/tokens";

type Scenario = "base" | "salaryUp" | "extraEMI" | "jobloss";

const HORIZONS = [
  { value: 6, label: "6M" },
  { value: 12, label: "12M" },
  { value: 18, label: "18M" },
  { value: 24, label: "24M" },
  { value: 36, label: "3Y" },
];

const SCENARIOS = [
  { value: "base" as const, label: "Baseline" },
  { value: "salaryUp" as const, label: "+20% salary" },
  { value: "extraEMI" as const, label: "+₹15k spend" },
  { value: "jobloss" as const, label: "Job loss" },
];

function scenarioProfile(p: Profile, s: Scenario): Profile {
  if (s === "jobloss") return { ...p, monthlySalary: 0 };
  if (s === "salaryUp") return { ...p, monthlySalary: p.monthlySalary * 1.2 };
  if (s === "extraEMI") return { ...p, monthlyVariableSpend: p.monthlyVariableSpend + 15000 };
  return p;
}

export default function ForecastScreen() {
  const { profile, emis, bills, cards } = useStore();
  const [horizon, setHorizon] = useState(18);
  const [scenario, setScenario] = useState<Scenario>("base");

  const points = forecast(scenarioProfile(profile, scenario), emis, bills, cards, horizon);
  const balances = points.map((p) => p.balance);
  const endBalance = balances[balances.length - 1] ?? 0;
  const lowest = balances.length ? Math.min(...balances) : 0;
  const firstNegative = points.find((p) => p.balance < 0);

  const step = Math.max(1, Math.ceil(points.length / 6));
  const chartValues = points.map((p) => p.balance);
  const chartLabels = points.map((p, i) => (i % step === 0 ? new Date(p.date).toLocaleDateString("en-IN", { month: "short" }) : ""));
  const negative = endBalance < 0 || lowest < 0;
  const lineColor = negative ? colors.negative : colors.accent;

  return (
    <Screen>
      <Text style={styles.h1}>Forecast</Text>

      <Segmented options={HORIZONS} value={horizon} onChange={setHorizon} />
      <Segmented options={SCENARIOS} value={scenario} onChange={setScenario} />

      <Card>
        <Text style={styles.cardTitle}>Projected balance</Text>
        <View style={{ marginTop: spacing.md }}>
          <AreaChart
            values={chartValues}
            labels={chartLabels}
            height={200}
            color={lineColor}
            formatY={(v) => formatCurrency(v, profile.currency, true)}
          />
        </View>
      </Card>

      <View style={styles.tiles}>
        <StatTile label="End balance" value={formatCurrency(endBalance, profile.currency, true)} tone={endBalance < 0 ? colors.negative : undefined} />
        <StatTile label="Lowest point" value={formatCurrency(lowest, profile.currency, true)} tone={lowest < 0 ? colors.negative : undefined} />
        <StatTile
          label="Goes negative"
          value={firstNegative ? new Date(firstNegative.date).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }) : "Never"}
          tone={firstNegative ? colors.negative : colors.positive}
        />
      </View>

      {scenario === "jobloss" && firstNegative ? (
        <Card style={{ borderColor: colors.negative, backgroundColor: "rgba(244,63,94,0.08)" }}>
          <Text style={styles.cardTitle}>Job-loss runway</Text>
          <Text style={styles.muted}>
            With no income, your balance turns negative by{" "}
            {new Date(firstNegative.date).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}. That is your
            survival window — keep your emergency fund above this gap.
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: 28, fontWeight: "700" },
  cardTitle: { ...typography.heading },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
