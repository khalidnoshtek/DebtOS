import { StyleSheet, View } from "react-native";
import { colors, radius } from "@/theme/tokens";

/** Thin horizontal progress bar. `value` 0..100. */
export function Progress({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
});
