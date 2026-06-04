import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/lib/store";
import type { Profile } from "@debtos/core";
import { CURRENCIES } from "@/lib/options";
import { exportBackup, importBackup } from "@/lib/backup";
import { colors, spacing, typography } from "@/theme/tokens";

export default function SettingsScreen() {
  const { profile, updateProfile, seedDemo, resetAll } = useStore();
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);

  const numField = (k: keyof Profile) => (t: string) => setForm({ ...form, [k]: Number(t) || 0 });

  const save = () => {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const doExport = async () => {
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Could not export.");
    }
  };

  const doImport = () => {
    Alert.alert("Import backup", "Replace all current data, or merge with it?", [
      { text: "Cancel", style: "cancel" },
      { text: "Merge", onPress: () => runImport("merge") },
      { text: "Replace", style: "destructive", onPress: () => runImport("replace") },
    ]);
  };

  const runImport = async (mode: "replace" | "merge") => {
    const res = await importBackup(mode);
    if (res.ok) {
      setForm(useStore.getState().profile);
      Alert.alert("Imported", `${res.counts.emis} EMIs · ${res.counts.cards} cards · ${res.counts.bills} bills.`);
    } else if (!("cancelled" in res)) {
      Alert.alert("Import failed", res.error);
    }
  };

  const confirmReset = () => {
    Alert.alert("Reset all data?", "This clears your profile, EMIs, cards, and bills.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => { resetAll(); setForm(useStore.getState().profile); } },
    ]);
  };

  return (
    <Screen>
      <Card>
        <Text style={styles.cardTitle}>Profile</Text>
        <Field label="Monthly salary" value={String(form.monthlySalary)} onChangeText={numField("monthlySalary")} numeric />
        <View style={styles.row}>
          <View style={styles.col}><Field label="Salary day" value={String(form.salaryDay)} onChangeText={numField("salaryDay")} numeric /></View>
          <View style={styles.col}><Field label="Bank balance" value={String(form.currentBalance)} onChangeText={numField("currentBalance")} numeric /></View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}><Field label="Emergency fund" value={String(form.emergencyFund)} onChangeText={numField("emergencyFund")} numeric /></View>
          <View style={styles.col}><Field label="Variable spend" value={String(form.monthlyVariableSpend)} onChangeText={numField("monthlyVariableSpend")} numeric /></View>
        </View>
        <Select label="Currency" value={form.currency} options={CURRENCIES} onChange={(c) => setForm({ ...form, currency: c })} />
        <Button title={saved ? "Saved ✓" : "Save"} onPress={save} style={{ marginTop: spacing.md }} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Backup & restore</Text>
        <Text style={styles.muted}>Export a JSON backup or import one. Compatible with the DebtOS web app.</Text>
        <Button title="Export backup" variant="secondary" onPress={doExport} style={{ marginTop: spacing.sm }} />
        <Button title="Import backup" variant="secondary" onPress={doImport} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Data</Text>
        <Button title="Load demo data" variant="secondary" onPress={seedDemo} />
        <Button title="Reset all data" variant="danger" onPress={confirmReset} />
      </Card>

      <Text style={styles.version}>DebtOS · native v1</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typography.heading, marginBottom: spacing.xs },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  row: { flexDirection: "row", gap: spacing.md },
  col: { flex: 1 },
  version: { color: colors.textFaint, fontSize: 12, textAlign: "center", marginTop: spacing.md },
});
