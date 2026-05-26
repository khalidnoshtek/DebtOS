"use client";

import { useEffect, useState } from "react";
import { Save, Sparkles, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
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

  useEffect(() => setMounted(true), []);
  useEffect(() => setForm(profile), [profile]);

  if (!mounted) return null;

  const save = () => {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly salary">
              <Input type="number" inputMode="decimal" value={form.monthlySalary} onChange={(e) => setForm({ ...form, monthlySalary: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Salary day">
              <Input type="number" min="1" max="28" value={form.salaryDay} onChange={(e) => setForm({ ...form, salaryDay: Number(e.target.value) || 1 })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current bank balance">
              <Input type="number" inputMode="decimal" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: Number(e.target.value) || 0 })} />
            </Field>
            <Field label="Emergency fund">
              <Input type="number" inputMode="decimal" value={form.emergencyFund} onChange={(e) => setForm({ ...form, emergencyFund: Number(e.target.value) || 0 })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
