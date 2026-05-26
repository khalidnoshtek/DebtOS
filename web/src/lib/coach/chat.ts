"use client";

import { getEngine } from "./engine";
import { SYSTEM_PROMPT } from "./system-prompt";
import { buildSnapshot } from "./snapshot";
import { applyAction, extractActions } from "./actions";
import type { ActionRecord, ChatMessage } from "./types";

type StreamCallbacks = {
  onToken: (delta: string) => void;
  onActions: (actions: ActionRecord[]) => void;
  onError: (message: string) => void;
};

export async function streamChat(
  history: ChatMessage[],
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
): Promise<{ assistantText: string; actions: ActionRecord[] }> {
  const engine = await getEngine();

  const snapshot = buildSnapshot();

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "system" as const, content: snapshot },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  let fullText = "";
  let bufferForActions = "";

  try {
    const stream = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 800,
    });

    for await (const chunk of stream) {
      if (abortSignal?.aborted) {
        await engine.interruptGenerate();
        break;
      }
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      fullText += delta;
      bufferForActions += delta;
      // Stream only the user-visible text portion (strip any action blocks live).
      // For simplicity, surface raw delta; UI also strips action tags when rendering.
      callbacks.onToken(delta);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    callbacks.onError(message);
    return { assistantText: fullText, actions: [] };
  }

  const { cleanedText, raws } = extractActions(fullText);
  const actionResults = raws.map(applyAction);
  if (actionResults.length) callbacks.onActions(actionResults);

  return { assistantText: cleanedText || fullText, actions: actionResults };
}
