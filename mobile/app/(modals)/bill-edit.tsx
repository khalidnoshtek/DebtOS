import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import type { Bill } from "@debtos/core";
import { BILL_CATEGORIES } from "@/lib/options";
import { colors, spacing } from "@/theme/tokens";

export default function BillEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { bills, addBill, updateBill, removeBill } = useStore();
  const existing = bills.find((b) => b.id === id);

  const [name, setName] = useState(existing?.name ?? "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [dueDay, setDueDay] = useState(existing ? String(existing.dueDay) : "1");
  const [category, setCategory] = useState<Bill["category"]>(existing?.category ?? "utilities");

  const num = (s: string) => Number(s) || 0;

  const save = () => {
    if (!name.trim() || num(amount) <= 0) {
      Alert.alert("Missing details", "Enter a name and an amount.");
      return;
    }
    const payload = { name: name.trim(), amount: num(amount), dueDay: num(dueDay), category };
    if (existing) updateBill(existing.id, payload);
    else addBill(payload);
    router.back();
  };

  const confirmDelete = () => {
    Alert.alert("Delete bill?", `Remove "${existing?.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { removeBill(existing!.id); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Rent" />
        <Field label="Amount" value={amount} onChangeText={setAmount} numeric />
        <Field label="Due day (1–28)" value={dueDay} onChangeText={setDueDay} numeric />
        <Select label="Category" value={category} options={BILL_CATEGORIES} onChange={setCategory} />

        <Button title={existing ? "Save changes" : "Add bill"} onPress={save} style={{ marginTop: spacing.md }} />
        {existing ? <Button title="Delete" variant="danger" onPress={confirmDelete} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
});
