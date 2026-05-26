"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Receipt, Calendar } from "lucide-react";
import { useStore } from "@/lib/store";
import { totalMonthlyBills } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import type { Bill } from "@/lib/types";

const BILL_CATEGORIES: { value: Bill["category"]; label: string }[] = [
  { value: "rent", label: "Rent / mortgage" },
  { value: "utilities", label: "Utilities" },
  { value: "subscription", label: "Subscription" },
  { value: "insurance", label: "Insurance" },
  { value: "groceries", label: "Groceries" },
  { value: "other", label: "Other" },
];

export default function BillsPage() {
  const { bills, profile, addBill, updateBill, removeBill } = useStore();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new")) {
      setEditing(null);
      setOpen(true);
    }
  }, []);
  if (!mounted) return null;

  const total = totalMonthlyBills(bills);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Recurring Bills"
        description="Your monthly fixed obligations. Predictable outflows that anchor your cashflow forecast."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Add bill</Button>}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Monthly bill total" value={formatCurrency(total, profile.currency)} icon={Receipt} />
        <StatCard label="Bills tracked" value={String(bills.length)} delay={0.05} />
        <StatCard label="% of salary" value={profile.monthlySalary > 0 ? `${((total / profile.monthlySalary) * 100).toFixed(1)}%` : "—"} delay={0.1} />
      </section>

      <section className="mt-6">
        {bills.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No bills yet"
            description="Add rent, utilities, subscriptions, and insurance to make your forecast precise."
            action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />Add bill</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {[...bills].sort((a, b) => a.dueDay - b.dueDay).map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">{b.name}</div>
                          <div className="text-[10px] uppercase tracking-wider text-white/40">{BILL_CATEGORIES.find(c => c.value === b.category)?.label}</div>
                        </div>
                        <div className="tabular text-base font-semibold text-white">{formatCurrency(b.amount, profile.currency)}</div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          <Calendar className="h-3 w-3" /> Due day {b.dueDay}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditing(b); setOpen(true); }}>Edit</Button>
                          <Button variant="ghost" size="icon" onClick={() => confirm("Delete this bill?") && removeBill(b.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      <BillDialog
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        onSubmit={(v) => {
          if (editing) updateBill(editing.id, v);
          else addBill(v);
          setOpen(false);
        }}
      />
    </div>
  );
}

function BillDialog({
  open, onClose, editing, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  editing: Bill | null;
  onSubmit: (v: Omit<Bill, "id" | "createdAt">) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [category, setCategory] = useState<Bill["category"]>("other");

  useEffect(() => {
    if (editing) {
      setName(editing.name); setAmount(String(editing.amount));
      setDay(String(editing.dueDay)); setCategory(editing.category);
    } else {
      setName(""); setAmount(""); setDay("1"); setCategory("other");
    }
  }, [editing, open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSubmit({
      name,
      amount: Number(amount) || 0,
      dueDay: Math.min(28, Math.max(1, Number(day) || 1)),
      category,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title={editing ? "Edit bill" : "Add bill"}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rent, Netflix" required /></Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Amount"><Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
          <Field label="Due day"><Input type="number" min="1" max="28" value={day} onChange={(e) => setDay(e.target.value)} /></Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as Bill["category"])}>
              {BILL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editing ? "Save" : "Add bill"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
