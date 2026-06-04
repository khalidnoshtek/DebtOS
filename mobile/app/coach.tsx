import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import type { ActionRecord } from "@debtos/core";
import { SYSTEM_PROMPT } from "@/lib/coach/system-prompt";
import { buildSnapshot } from "@/lib/coach/snapshot";
import { parseAndRunActions } from "@/lib/coach/actions";
import { chat, downloadModel, isModelReady, type ChatMsg } from "@/lib/coach/engine";
import { colors, radius, spacing, typography } from "@/theme/tokens";

type Row = { role: "user" | "assistant"; text: string; actions?: ActionRecord[] };
type EngineState =
  | { s: "checking" }
  | { s: "needs-download" }
  | { s: "downloading"; p: number }
  | { s: "ready" }
  | { s: "error"; msg: string };

const SUGGESTIONS = [
  "Which EMI should I close first?",
  "Add a personal loan: 3L at 12% for 2 years",
  "Where should a ₹2L bonus go?",
];

export default function CoachScreen() {
  const [engine, setEngine] = useState<EngineState>({ s: "checking" });
  const [rows, setRows] = useState<Row[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    isModelReady().then((ready) => setEngine(ready ? { s: "ready" } : { s: "needs-download" }));
  }, []);

  const startDownload = async () => {
    setEngine({ s: "downloading", p: 0 });
    try {
      await downloadModel((p) => setEngine({ s: "downloading", p }));
      setEngine({ s: "ready" });
    } catch (e) {
      setEngine({ s: "error", msg: e instanceof Error ? e.message : "Download failed" });
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || busy || engine.s !== "ready") return;
    const userRow: Row = { role: "user", text: text.trim() };
    const history = [...rows, userRow];
    setRows(history);
    setInput("");
    setBusy(true);
    setStreaming("");

    const messages: ChatMsg[] = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${buildSnapshot()}` },
      ...history.map((r) => ({ role: r.role, content: r.text }) as ChatMsg),
    ];

    try {
      let acc = "";
      const full = await chat(messages, (tok) => {
        acc += tok;
        setStreaming(acc.replace(/<action>[\s\S]*?<\/action>/g, "").trim());
      });
      const { text: clean, actions } = parseAndRunActions(full);
      setRows((r) => [...r, { role: "assistant", text: clean || "Done.", actions }]);
    } catch (e) {
      setRows((r) => [...r, { role: "assistant", text: `Error: ${e instanceof Error ? e.message : "generation failed"}` }]);
    } finally {
      setBusy(false);
      setStreaming("");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (engine.s === "checking") {
    return <Center><ActivityIndicator color={colors.accent} /></Center>;
  }

  if (engine.s === "needs-download" || engine.s === "downloading" || engine.s === "error") {
    return (
      <Center>
        <Feather name="cpu" size={40} color={colors.accent} />
        <Text style={styles.title}>On-device AI coach</Text>
        <Text style={styles.muted}>
          DebtOS Coach runs a small language model entirely on your phone — your financial data never leaves the
          device. Download the model once (~400 MB) to begin.
        </Text>
        {engine.s === "downloading" ? (
          <View style={{ width: "100%", marginTop: spacing.lg }}>
            <Text style={styles.muted}>Downloading… {Math.round(engine.p * 100)}%</Text>
            <View style={styles.track}><View style={[styles.fill, { width: `${engine.p * 100}%` }]} /></View>
          </View>
        ) : (
          <Button title="Download model" onPress={startDownload} style={{ marginTop: spacing.lg }} />
        )}
        {engine.s === "error" ? <Text style={styles.err}>{engine.msg}</Text> : null}
      </Center>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.chat} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {rows.length === 0 ? (
            <View style={styles.suggest}>
              <Text style={styles.muted}>Ask about payoff strategy, or describe a loan to add it.</Text>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {rows.map((r, i) => (
            <View key={i} style={[styles.bubble, r.role === "user" ? styles.user : styles.assistant]}>
              <Text style={styles.bubbleText}>{r.text}</Text>
              {r.actions?.map((a, j) => (
                <View key={j} style={[styles.pill, a.kind === "error" && styles.pillErr]}>
                  <Feather name={a.kind === "error" ? "alert-circle" : "check-circle"} size={13} color={a.kind === "error" ? colors.negative : colors.positive} />
                  <Text style={styles.pillText}>{a.summary}</Text>
                </View>
              ))}
            </View>
          ))}

          {busy ? (
            <View style={[styles.bubble, styles.assistant]}>
              <Text style={styles.bubbleText}>{streaming || "Thinking…"}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message DebtOS Coach…"
            placeholderTextColor={colors.textFaint}
            multiline
            editable={!busy}
          />
          <Pressable style={[styles.sendBtn, (busy || !input.trim()) && { opacity: 0.4 }]} onPress={() => send(input)} disabled={busy || !input.trim()}>
            <Feather name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.sm },
  title: { ...typography.title, marginTop: spacing.md },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  err: { color: colors.negative, fontSize: 13, marginTop: spacing.md, textAlign: "center" },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginTop: spacing.sm },
  fill: { height: "100%", backgroundColor: colors.accent, borderRadius: radius.pill },
  chat: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  suggest: { gap: spacing.sm },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md },
  chipText: { color: colors.text, fontSize: 14 },
  bubble: { maxWidth: "88%", borderRadius: radius.lg, padding: spacing.md },
  user: { alignSelf: "flex-end", backgroundColor: colors.accent },
  assistant: { alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 22 },
  pill: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, backgroundColor: "rgba(52,211,153,0.1)", borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  pillErr: { backgroundColor: "rgba(244,63,94,0.1)" },
  pillText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 120, color: colors.text, fontSize: 15, backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});
