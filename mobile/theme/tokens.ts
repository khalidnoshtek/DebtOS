import type { StressBand } from "@debtos/core";

/**
 * Native design tokens for DebtOS — the RN counterpart of the web's Tailwind
 * theme. Hexes are the resolved forms of the web classes so the two apps read
 * identically (emerald-400 #34d399, amber-400 #fbbf24, orange-400 #fb923c,
 * rose-500 #f43f5e).
 */
export const colors = {
  background: "#050507",
  surface: "#0c0c10",
  surfaceElevated: "#141418",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#fafafa",
  textMuted: "rgba(250,250,250,0.6)",
  textFaint: "rgba(250,250,250,0.4)",
  accent: "#6366f1",
  accentSoft: "rgba(99,102,241,0.15)",
  positive: "#34d399",
  negative: "#f43f5e",
} as const;

export type StressTone = { fg: string; bg: string; border: string };

const STRESS: Record<StressBand, StressTone> = {
  stable: { fg: "#34d399", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.30)" },
  warning: { fg: "#fbbf24", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)" },
  dangerous: { fg: "#fb923c", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.30)" },
  critical: { fg: "#f43f5e", bg: "rgba(244,63,94,0.10)", border: "rgba(244,63,94,0.30)" },
};

/** Native replacement for the web's stressColor()/stressBg() helpers. */
export function stressTokens(band: StressBand): StressTone {
  return STRESS[band];
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const typography = {
  display: { fontSize: 32, fontWeight: "700" as const, color: colors.text },
  title: { fontSize: 20, fontWeight: "600" as const, color: colors.text },
  heading: { fontSize: 16, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.text },
  caption: { fontSize: 12, fontWeight: "500" as const, color: colors.textMuted },
  tabular: { fontVariant: ["tabular-nums" as const] },
} as const;
