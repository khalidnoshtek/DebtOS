import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/theme/tokens";

/** A tappable hub row linking to a pushed screen, with icon + subtitle. */
export function NavRow({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Feather name={icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Feather name="chevron-right" size={20} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.8 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  subtitle: { color: colors.textMuted, fontSize: 13 },
});
