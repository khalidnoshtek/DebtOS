import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing, typography } from "@/theme/tokens";

/**
 * Labeled text/number input. `numeric` switches to the OS decimal keypad —
 * the native equivalent of the web's <input type="number" inputMode="decimal">.
 */
export function Field({
  label,
  value,
  onChangeText,
  numeric,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  numeric?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? "decimal-pad" : "default"}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "500" },
  input: {
    ...typography.body,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
