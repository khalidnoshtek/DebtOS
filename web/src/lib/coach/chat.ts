"use client";

import { getEngine } from "./engine";
import { SYSTEM_PROMPT } from "./system-prompt";
import { buildSnapshot } from "./snapshot";
import { applyAction, extractActions } from "./actions";
import type { ActionRecord, ChatMessage } from "./types";

type StreamCallbacks = {
  onToken: (delta: string) => void;
  onActions: (actions: ActionRecord[]) => void;
};

export type ChatResult = {
  assistantText: string;
  actions: ActionRecord[];
  error?: string;
};

export async function streamChat(
  history: ChatMessage[],
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<ChatResult> {
  const engine = await getEngine();

  const snapshot = buildSnapshot();

  // IMPORTANT: WebLLM (OpenAI-compatible) requires exactly one system message
  // at position 0. Fold the live financial snapshot into the system prompt.
  const messages = [
    {
      role: "system" as const,
      content: `${SYSTEM_PROMPT}\n\n---\n\n${snapshot}`,
    },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  let fullText = "";

  try {
    const stream = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.2,
      max_tokens: 2048,
    });

    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
        await engine.interruptGenerate();
        break;
      }
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      fullText += delta;
      callbacks.onToken(delta);
    }
  } catch (err) {
    return {
      assistantText: "",
      actions: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const { cleanedText, raws } = extractActions(fullText);
  const actionResults = raws.map(applyAction);
  if (actionResults.length) callbacks.onActions(actionResults);

  // When the model only emitted action tags and no chat text, generate a
  // human-friendly confirmation summarizing what was done.
  const text =
    cleanedText && cleanedText.trim().length > 0
      ? cleanedText.trim()
      : summarizeActions(actionResults);

  return { assistantText: text, actions: actionResults };
}

function summarizeActions(actions: ActionRecord[]): string {
  if (actions.length === 0) return "";
  const ok = actions.filter((a) => a.kind !== "error");
  const errors = actions.filter((a) => a.kind === "error");
  const parts: string[] = [];
  if (ok.length) {
    const lines = ok.map((a) => `• ${a.summary}`).join("\n");
    parts.push(`Done — applied ${ok.length} ${ok.length === 1 ? "update" : "updates"}:\n${lines}`);
  }
  if (errors.length) {
    const lines = errors.map((a) => `• ${a.summary}${a.detail ? ` — ${a.detail.slice(0, 80)}` : ""}`).join("\n");
    parts.push(`\n${errors.length} ${errors.length === 1 ? "issue" : "issues"}:\n${lines}`);
  }
  return parts.join("\n");
}
