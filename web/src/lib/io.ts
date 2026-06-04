"use client";

import { useStore } from "./store";
import {
  buildExportPayload,
  parseImport,
  mergeBackup,
  backupFilename,
  type ImportMode,
  type ImportCounts,
} from "@debtos/core";

// Validation/merge/payload logic is shared via @debtos/core. Only the browser
// file I/O (Blob download, File.text()) lives here.

export type ImportResult =
  | { ok: true; counts: ImportCounts }
  | { ok: false; error: string };

export function exportToFile() {
  const payload = buildExportPayload(useStore.getState());
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importFromFile(file: File, mode: ImportMode = "replace"): Promise<ImportResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Could not read the selected file" };
  }

  const parsed = parseImport(text);
  if (!parsed.ok) return parsed;

  if (mode === "replace") {
    useStore.setState(parsed.data);
  } else {
    useStore.setState(mergeBackup(useStore.getState(), parsed.data));
  }

  return { ok: true, counts: parsed.counts };
}
