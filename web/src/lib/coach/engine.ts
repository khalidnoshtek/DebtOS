"use client";

import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import type { EngineStatus } from "./types";

export const DEFAULT_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

let enginePromise: Promise<MLCEngineInterface> | null = null;
let currentStatus: EngineStatus = { state: "uninitialized" };
const listeners = new Set<(s: EngineStatus) => void>();

function setStatus(next: EngineStatus) {
  currentStatus = next;
  listeners.forEach((l) => l(next));
}

export function getStatus() {
  return currentStatus;
}

export function subscribeStatus(fn: (s: EngineStatus) => void) {
  listeners.add(fn);
  fn(currentStatus);
  return () => listeners.delete(fn);
}

export function hasWebGPU() {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator;
}

export async function getEngine(modelId = DEFAULT_MODEL): Promise<MLCEngineInterface> {
  if (typeof window === "undefined") {
    throw new Error("WebLLM only works in the browser");
  }
  if (!hasWebGPU()) {
    throw new Error("WebGPU not available — use Chrome, Edge, or recent Safari on a desktop");
  }
  if (enginePromise) return enginePromise;

  setStatus({ state: "checking" });

  enginePromise = (async () => {
    const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
    const worker = new Worker(new URL("./mlc-worker.ts", import.meta.url), {
      type: "module",
    });

    const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: (report) => {
        setStatus({
          state: "downloading",
          progress: report.progress,
          text: report.text,
        });
      },
    });

    setStatus({ state: "ready", modelId });
    return engine;
  })().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    setStatus({ state: "error", message });
    enginePromise = null;
    throw err;
  });

  return enginePromise;
}

export async function isModelCached(modelId = DEFAULT_MODEL) {
  if (typeof window === "undefined") return false;
  try {
    const { hasModelInCache } = await import("@mlc-ai/web-llm");
    return await hasModelInCache(modelId);
  } catch {
    return false;
  }
}
