import { test, expect } from "@playwright/test";

/**
 * Smoke coverage: every route in the app shell must load its static export,
 * hydrate, and render its page header without a client-side crash.
 */
const routes: { path: string; heading: RegExp }[] = [
  { path: "/", heading: /Welcome to DebtOS|Safe to spend/i },
  { path: "/emis/", heading: /EMI Intelligence/i },
  { path: "/cards/", heading: /Credit Card Risk Engine/i },
  { path: "/bills/", heading: /Recurring Bills/i },
  { path: "/stress/", heading: /Financial Stress Engine/i },
  { path: "/simulator/", heading: /Purchase Simulator/i },
  { path: "/forecast/", heading: /Forecast Engine/i },
  { path: "/coach/", heading: /DebtOS Coach/i },
  { path: "/settings/", heading: /Settings/i },
];

for (const { path, heading } of routes) {
  test(`route ${path} loads and renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(path);
    await expect(page.getByText(heading).first()).toBeVisible();

    expect(errors, `runtime errors on ${path}`).toEqual([]);
  });
}
