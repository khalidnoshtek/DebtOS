"use client";

import { useEffect, useRef, useState } from "react";
import {
  Save,
  Sparkles,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { exportToFile, importFromFile, type ImportResult } from "@/lib/io";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { profile, updateProfile, seedDemo, resetAll } = useStore();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setForm(profile), [profile]);

  if (!mounted) return null;

  const save = () => {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const mode = confirm(
      "Click OK to REPLACE all current data with the backup.\n\nClick Cancel to MERGE (keeps your existing data, adds anything new from the backup).",
    )
      ? "replace"
      : "merge";
    const result = await importFromFile(file, mode);
    setImportStatus(result);
    if (result.ok) {
      setTimeout(() => setImportStatus(null), 8000);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Settings"
        description="Your financial profile drives every calculation. Keep it accurate."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monthly salary">
              <Input type="number" inputMode="decimal" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Salary day">
              <Input type="number" min="1" max="28" value={form.salaryDay} onChange={(e) => setForm({ ...form, salaryDay: Number(e.target.value) || 1 })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Current bank balance">
              <Input type="number" inputMode="decimal" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Emergency fund">
              <Input type="number" inputMode="decimal" value={form.emergencyFund} onChange={(e) => setForm({ ...form, emergencyFund: Number(e.target.value) || 0 })} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monthly variable spend">
              <Input type="number" inputMode="decimal" value={form.monthlyVariableSpend} onChange={(e) => setForm({ ...form, monthlyVariableSpend: Number(e.target.value) || 0 })} />
              <div className="mt-1 text-[10px] text-white/40">Avg discretionary: dining, shopping, fuel, etc.</div>
            </Field>
            <Field label="Currency">
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as "INR" | "USD" | "EUR" | "GBP" })}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </Field>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={save}>
              <Save className="h-4 w-4" />
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Backup & restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-white/60">
            Export your data as a JSON file. Import it on another device — useful for moving from the desktop site to the Android app, or just for backups.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={exportToFile}>
              <Download className="h-4 w-4" />
              Export to JSON
            </Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import from JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {importStatus && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                importStatus.ok
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100"
                  : "border-rose-500/30 bg-rose-500/5 text-rose-100"
              }`}
            >
              {importStatus.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              )}
              <div>
                {importStatus.ok ? (
                  <>
                    Imported {importStatus.counts.emis} EMI{importStatus.counts.emis === 1 ? "" : "s"},{" "}
                    {importStatus.counts.cards} card{importStatus.counts.cards === 1 ? "" : "s"},{" "}
                    {importStatus.counts.bills} bill{importStatus.counts.bills === 1 ? "" : "s"}
                    {importStatus.counts.chat > 0 && `, ${importStatus.counts.chat} chat row${importStatus.counts.chat === 1 ? "" : "s"}`}
                    .
                  </>
                ) : (
                  importStatus.error
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={seedDemo}>
            <Sparkles className="h-4 w-4" />
            Load demo data
          </Button>
          <Button variant="destructive" onClick={() => confirm("This will delete everything. Continue?") && resetAll()}>
            <RotateCcw className="h-4 w-4" />
            Reset all data
          </Button>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-white/30">
        DebtOS v0.1 · all data stored locally in your browser
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
