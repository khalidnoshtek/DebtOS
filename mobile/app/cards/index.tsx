import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Progress } from "@/components/ui/Progress";
import { Fab } from "@/components/ui/Fab";
import { useStore } from "@/lib/store";
import { cardUtilization, totalCardUtilization, formatCurrency, formatPercent } from "@debtos/core";
import { colors, spacing, typography } from "@/theme/tokens";

function utilColor(pct: number) {
  if (pct < 30) return colors.positive;
  if (pct < 50) return "#fbbf24";
  if (pct < 75) return "#fb923c";
  return colors.negative;
}

export default function CardsScreen() {
  const router = useRouter();
  const { cards, profile } = useStore();
  const totalBalance = cards.reduce((s, c) => s + c.currentBalance, 0);
  const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
  const totalMin = cards.reduce((s, c) => s + c.minDue, 0);
  const util = totalCardUtilization(cards);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <View style={styles.tiles}>
          <StatTile label="Total balance" value={formatCurrency(totalBalance, profile.currency)} hint={`of ${formatCurrency(totalLimit, profile.currency)}`} />
          <StatTile label="Utilization" value={formatPercent(util)} tone={utilColor(util)} />
          <StatTile label="Min due / mo" value={formatCurrency(totalMin, profile.currency)} />
          <StatTile label="Cards" value={String(cards.length)} />
        </View>

        {cards.length === 0 ? (
          <Card><Text style={styles.empty}>No cards yet. Tap + to add one.</Text></Card>
        ) : (
          cards.map((c) => {
            const u = cardUtilization(c);
            const revolving = c.currentBalance > c.minDue;
            return (
              <Pressable key={c.id} onPress={() => router.push(`/(modals)/card-edit?id=${c.id}`)}>
                <Card>
                  <View style={styles.rowBetween}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text style={styles.bank}>{c.bank}</Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.util}>{formatPercent(u)} used</Text>
                    <Text style={styles.sub}>{formatCurrency(c.currentBalance, profile.currency)} / {formatCurrency(c.limit, profile.currency)}</Text>
                  </View>
                  <Progress value={u} color={utilColor(u)} />
                  <View style={styles.grid}>
                    <Mini label="Min due" value={formatCurrency(c.minDue, profile.currency)} />
                    <Mini label="Statement" value={`Day ${c.statementDate}`} />
                    <Mini label="Due" value={`Day ${c.dueDate}`} />
                    <Mini label="APR" value={`${c.interestRateAPR}%`} />
                  </View>
                  {revolving ? (
                    <Text style={styles.warn}>
                      Revolving {formatCurrency(c.currentBalance - c.minDue, profile.currency)} at {c.interestRateAPR}% APR
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}
      </Screen>
      <Fab onPress={() => router.push("/(modals)/card-edit")} />
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
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  bank: { color: colors.textMuted, fontSize: 13 },
  util: { color: colors.text, fontSize: 14, fontWeight: "600" },
  sub: { color: colors.textFaint, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm },
  mini: { width: "50%", paddingVertical: spacing.xs },
  miniLabel: { color: colors.textMuted, fontSize: 11 },
  miniValue: { color: colors.text, fontSize: 14, fontWeight: "600", ...typography.tabular },
  warn: { color: colors.negative, fontSize: 12, marginTop: spacing.sm },
});
