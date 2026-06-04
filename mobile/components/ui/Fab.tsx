import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { colors, radius } from "@/theme/tokens";

/** Floating action button, bottom-right. */
export function Fab({ onPress, icon = "plus" }: { onPress: () => void; icon?: keyof typeof Feather.glyphMap }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}>
      <Feather name={icon} size={26} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
