import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { emiAmount, type EMI } from "@debtos/core";
import { EMI_CATEGORIES } from "@/lib/options";
import { colors, spacing } from "@/theme/tokens";

export default function EmiEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { emis, addEMI, updateEMI, removeEMI } = useStore();
  const existing = emis.find((e) => e.id === id);

  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState<EMI["category"]>(existing?.category ?? "personal");
  const [monthly, setMonthly] = useState(existing ? String(Math.round(existing.monthlyAmount)) : "");
  const [tenure, setTenure] = useState(existing ? String(existing.tenureMonths) : "");
  const [monthsPaid, setMonthsPaid] = useState(existing ? String(existing.monthsPaid) : "0");
  const [rate, setRate] = useState(existing ? String(existing.interestRate) : "");
  const [principal, setPrincipal] = useState(existing ? String(existing.principal) : "");

  const num = (s: string) => Number(s) || 0;

  const save = () => {
    if (!name.trim() || num(tenure) <= 0) {
      Alert.alert("Missing details", "Enter a name and a tenure greater than 0.");
      return;
    }
    const tenureMonths = num(tenure);
    const interestRate = num(rate);
    const principalVal = num(principal) || num(monthly) * tenureMonths;
    const monthlyAmount = num(monthly) || emiAmount(principalVal, interestRate, tenureMonths);

    if (existing) {
      updateEMI(existing.id, {
        name: name.trim(),
        category,
        monthlyAmount,
        tenureMonths,
        monthsPaid: num(monthsPaid),
        interestRate,
        principal: principalVal,
      });
    } else {
      addEMI({
        name: name.trim(),
        category,
        principal: principalVal,
        monthlyAmount,
        interestRate,
        tenureMonths,
        monthsPaid: num(monthsPaid),
        startDate: new Date().toISOString(),
      });
    }
    router.back();
  };

  const confirmDelete = () => {
    Alert.alert("Delete EMI?", `Remove "${existing?.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { removeEMI(existing!.id); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Car Loan — ICICI" />
        <Select label="Category" value={category} options={EMI_CATEGORIES} onChange={setCategory} />
        <Field label="Monthly EMI" value={monthly} onChangeText={setMonthly} numeric />
        <View style={styles.row}>
          <View style={styles.col}><Field label="Tenure (months)" value={tenure} onChangeText={setTenure} numeric /></View>
          <View style={styles.col}><Field label="Months paid" value={monthsPaid} onChangeText={setMonthsPaid} numeric /></View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}><Field label="Interest % p.a." value={rate} onChangeText={setRate} numeric /></View>
          <View style={styles.col}><Field label="Principal (opt.)" value={principal} onChangeText={setPrincipal} numeric /></View>
        </View>

        <Button title={existing ? "Save changes" : "Add EMI"} onPress={save} style={{ marginTop: spacing.md }} />
        {existing ? <Button title="Delete" variant="danger" onPress={confirmDelete} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", gap: spacing.md },
  col: { flex: 1 },
});
