import type { Bill, EMI, Profile } from "@debtos/core";
import type { SelectOption } from "@/components/ui/Select";

// The three native pickers' option sets — mirrors the web <select> contents.

export const EMI_CATEGORIES: SelectOption<EMI["category"]>[] = [
  { value: "home", label: "Home loan" },
  { value: "car", label: "Car / vehicle" },
  { value: "personal", label: "Personal loan" },
  { value: "education", label: "Education" },
  { value: "credit_card", label: "Credit card EMI" },
  { value: "consumer_durable", label: "Consumer durable" },
  { value: "other", label: "Other" },
];

export const BILL_CATEGORIES: SelectOption<Bill["category"]>[] = [
  { value: "rent", label: "Rent / mortgage" },
  { value: "utilities", label: "Utilities" },
  { value: "subscription", label: "Subscription" },
  { value: "insurance", label: "Insurance" },
  { value: "groceries", label: "Groceries" },
  { value: "other", label: "Other" },
];

export const CURRENCIES: SelectOption<Profile["currency"]>[] = [
  { value: "INR", label: "₹ Indian Rupee (INR)" },
  { value: "USD", label: "$ US Dollar (USD)" },
  { value: "EUR", label: "€ Euro (EUR)" },
  { value: "GBP", label: "£ British Pound (GBP)" },
];

export function categoryLabel<T extends string>(opts: SelectOption<T>[], value: T): string {
  return opts.find((o) => o.value === value)?.label ?? value;
}
