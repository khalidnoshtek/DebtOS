import { test, expect } from "@playwright/test";

/**
 * Functional flows exercising the deterministic financial core through the UI.
 * Each test gets an isolated browser context (fresh localStorage), so the
 * Zustand-persisted store starts empty.
 */

test("seeding demo data populates EMIs and the dashboard", async ({ page }) => {
  // The empty EMI page surfaces the "Try demo data" seeding affordance.
  await page.goto("/emis/");
  await expect(page.getByText(/EMI Intelligence/i)).toBeVisible();

  await page.getByRole("button", { name: /Try demo data/i }).click();

  // Seeded EMIs render by name.
  await expect(page.getByText(/Home Loan — HDFC/i)).toBeVisible();
  await expect(page.getByText(/Car Loan — ICICI/i)).toBeVisible();

  // Dashboard now leaves the empty state and shows live cashflow stats.
  await page.goto("/");
  await expect(page.getByText(/Safe to spend/i)).toBeVisible();
  await expect(page.getByText(/Welcome to DebtOS/i)).toHaveCount(0);
});

test("persisted data survives a full page reload", async ({ page }) => {
  await page.goto("/emis/");
  await page.getByRole("button", { name: /Try demo data/i }).click();
  await expect(page.getByText(/Home Loan — HDFC/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Home Loan — HDFC/i)).toBeVisible();
});

test("settings salary input drives the dashboard out of the empty state", async ({ page }) => {
  await page.goto("/settings/");
  await expect(page.getByText(/Settings/i).first()).toBeVisible();

  // The form holds edits locally and commits to the store on Save.
  const salary = page.locator('input[type="number"]').first();
  await salary.fill("90000");
  await page.getByRole("button", { name: /^Save$/ }).click();
  await expect(page.getByRole("button", { name: /Saved/ })).toBeVisible();

  await page.goto("/");
  await expect(page.getByText(/Welcome to DebtOS/i)).toHaveCount(0);
  await expect(page.getByText(/Safe to spend/i)).toBeVisible();
});

test("stress engine renders a composite score after seeding", async ({ page }) => {
  await page.goto("/emis/");
  await page.getByRole("button", { name: /Try demo data/i }).click();
  await expect(page.getByText(/Home Loan — HDFC/i)).toBeVisible();

  await page.goto("/stress/");
  await expect(page.getByText(/Financial Stress Engine/i)).toBeVisible();
  await expect(page.getByText(/Stress score/i).first()).toBeVisible();
});
