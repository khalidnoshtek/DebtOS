import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import { colors, spacing } from "@/theme/tokens";

export default function CardEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { cards, addCard, updateCard, removeCard } = useStore();
  const existing = cards.find((c) => c.id === id);

  const [name, setName] = useState(existing?.name ?? "");
  const [bank, setBank] = useState(existing?.bank ?? "");
  const [limit, setLimit] = useState(existing ? String(existing.limit) : "");
  const [balance, setBalance] = useState(existing ? String(existing.currentBalance) : "");
  const [minDue, setMinDue] = useState(existing ? String(existing.minDue) : "");
  const [statementDate, setStatementDate] = useState(existing ? String(existing.statementDate) : "1");
  const [dueDate, setDueDate] = useState(existing ? String(existing.dueDate) : "20");
  const [apr, setApr] = useState(existing ? String(existing.interestRateAPR) : "40");

  const num = (s: string) => Number(s) || 0;

  const save = () => {
    if (!name.trim() || num(limit) <= 0) {
      Alert.alert("Missing details", "Enter a card name and a credit limit.");
      return;
    }
    const payload = {
      name: name.trim(),
      bank: bank.trim(),
      limit: num(limit),
      currentBalance: num(balance),
      minDue: num(minDue),
      statementDate: num(statementDate),
      dueDate: num(dueDate),
      interestRateAPR: num(apr),
    };
    if (existing) updateCard(existing.id, payload);
    else addCard(payload);
    router.back();
  };

  const confirmDelete = () => {
    Alert.alert("Delete card?", `Remove "${existing?.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { removeCard(existing!.id); router.back(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Card name" value={name} onChangeText={setName} placeholder="e.g. HDFC Regalia" />
        <Field label="Bank" value={bank} onChangeText={setBank} placeholder="e.g. HDFC" />
        <View style={styles.row}>
          <View style={styles.col}><Field label="Credit limit" value={limit} onChangeText={setLimit} numeric /></View>
          <View style={styles.col}><Field label="Current balance" value={balance} onChangeText={setBalance} numeric /></View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}><Field label="Min due" value={minDue} onChangeText={setMinDue} numeric /></View>
          <View style={styles.col}><Field label="APR %" value={apr} onChangeText={setApr} numeric /></View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}><Field label="Statement day" value={statementDate} onChangeText={setStatementDate} numeric /></View>
          <View style={styles.col}><Field label="Due day" value={dueDate} onChangeText={setDueDate} numeric /></View>
        </View>

        <Button title={existing ? "Save changes" : "Add card"} onPress={save} style={{ marginTop: spacing.md }} />
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
