// Phase 1 smoke screen: proves the shared @debtos/core store runs natively on
// AsyncStorage. Replaced by the real Dashboard in Phase 3.
import { useStore } from "@/lib/store";
import {
  formatCurrency,
  safeToSpend,
  stressScore,
  totalMonthlyEMIs,
} from "@debtos/core";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SmokeScreen() {
  const { profile, emis, cards, bills, seedDemo, resetAll, hydrated } = useStore();
  const score = stressScore(profile, emis, cards);
  const safe = safeToSpend(profile, emis, bills, cards);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>DebtOS · shared-core smoke</Text>
        <Text style={styles.muted}>hydrated: {String(hydrated)}</Text>

        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={seedDemo}>
            <Text style={styles.btnText}>Seed demo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={resetAll}>
            <Text style={styles.btnText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.stat}>Salary: {formatCurrency(profile.monthlySalary, profile.currency)}</Text>
        <Text style={styles.stat}>Safe to spend: {formatCurrency(safe, profile.currency)}</Text>
        <Text style={styles.stat}>Monthly EMIs: {formatCurrency(totalMonthlyEMIs(emis), profile.currency)}</Text>
        <Text style={styles.stat}>Stress score: {score}</Text>
        <Text style={styles.stat}>
          {emis.length} EMIs · {cards.length} cards · {bills.length} bills
        </Text>

        <Text style={styles.label}>EMIs</Text>
        {emis.map((e) => (
          <Text key={e.id} style={styles.muted}>
            {e.name} — {formatCurrency(e.monthlyAmount, profile.currency)}/mo
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050507" },
  content: { padding: 20, gap: 8 },
  h1: { color: "#fafafa", fontSize: 20, fontWeight: "700" },
  label: { color: "#fafafa", fontSize: 14, fontWeight: "600", marginTop: 16 },
  stat: { color: "#fafafa", fontSize: 16 },
  muted: { color: "rgba(250,250,250,0.6)", fontSize: 14 },
  row: { flexDirection: "row", gap: 12, marginVertical: 12 },
  btn: { backgroundColor: "#6366f1", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 },
  btnGhost: { backgroundColor: "#27272a" },
  btnText: { color: "#fff", fontWeight: "600" },
});
