import * as FileSystem from "expo-file-system/legacy";
import { initLlama, type LlamaContext } from "llama.rn";

// Small instruct model — feasible to download + run on-device. Quality scales
// with size; 0.5B keeps it usable on an emulator without a GPU.
const MODEL_URL =
  "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf";
const MODEL_FILE = "qwen2.5-0.5b-instruct-q4_k_m.gguf";
const MODEL_PATH = FileSystem.documentDirectory + MODEL_FILE;

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

let ctx: LlamaContext | null = null;

export async function isModelReady(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  return info.exists && (info.size ?? 0) > 1_000_000;
}

/** Download the GGUF model, reporting 0..1 progress. */
export async function downloadModel(onProgress: (p: number) => void): Promise<void> {
  const resumable = FileSystem.createDownloadResumable(MODEL_URL, MODEL_PATH, {}, (d) => {
    if (d.totalBytesExpectedToWrite > 0) {
      onProgress(d.totalBytesWritten / d.totalBytesExpectedToWrite);
    }
  });
  await resumable.downloadAsync();
}

/** Lazily initialize the llama context from the downloaded model. */
export async function getContext(): Promise<LlamaContext> {
  if (ctx) return ctx;
  ctx = await initLlama({
    model: MODEL_PATH,
    n_ctx: 2048,
    n_gpu_layers: 0,
  });
  return ctx;
}

/** Stream a chat completion. Calls onToken for each new token; resolves with the full text. */
export async function chat(messages: ChatMsg[], onToken: (t: string) => void): Promise<string> {
  const context = await getContext();
  let full = "";
  const res = await context.completion(
    {
      messages,
      n_predict: 512,
      temperature: 0.6,
      top_p: 0.9,
      stop: ["<|im_end|>", "<|endoftext|>"],
    },
    (data: { token: string }) => {
      full += data.token;
      onToken(data.token);
    },
  );
  return (res?.text ?? full).trim();
}
