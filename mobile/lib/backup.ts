import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  buildExportPayload,
  parseImport,
  mergeBackup,
  backupFilename,
  type BackupData,
} from "@debtos/core";
import { useStore } from "@/lib/store";

/** Export the store as a JSON file and open the native share sheet. */
export async function exportBackup(): Promise<void> {
  const s = useStore.getState();
  const payload = buildExportPayload(s);
  const json = JSON.stringify(payload, null, 2);
  const uri = FileSystem.documentDirectory + backupFilename();
  await FileSystem.writeAsStringAsync(uri, json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "DebtOS backup" });
  }
}

export type ImportOutcome =
  | { ok: true; counts: { emis: number; cards: number; bills: number; chat: number } }
  | { ok: false; error: string }
  | { ok: false; cancelled: true };

/** Pick a JSON backup and apply it (replace or merge). */
export async function importBackup(mode: "replace" | "merge"): Promise<ImportOutcome> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return { ok: false, cancelled: true };

  const text = await FileSystem.readAsStringAsync(picked.assets[0].uri);
  const parsed = parseImport(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const data: BackupData = parsed.data;
  if (mode === "replace") {
    useStore.setState(data);
  } else {
    useStore.setState(mergeBackup(useStore.getState(), data));
  }
  return { ok: true, counts: parsed.counts };
}
