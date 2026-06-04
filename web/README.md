# DebtOS — webapp

The predictive financial survival platform from the PRD. EMI stacking, cashflow forecasting, stress scoring, and behavioral simulation.

## Stack

- Next.js 16 (App Router, Turbopack, React 19.2)
- Tailwind CSS v4
- Zustand (with `localStorage` persistence)
- Framer Motion
- Recharts
- Lucide icons

All data lives in the browser. No backend yet — `src/lib/store.ts` is the persistence layer and can be swapped for Supabase later without touching the UI.

## Run

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # production build
```

Click **Load demo data** in the top bar to populate realistic numbers (₹1.2L salary, 3 EMIs, 2 cards, 5 bills).

## Modules

| Route          | What it does                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `/`            | Live cashflow dashboard — safe-to-spend, burn, runway, 12mo forecast         |
| `/emis`        | EMI Intelligence — remaining tenure, interest, end dates                     |
| `/cards`       | Credit Card Risk Engine — utilization bands, revolving interest exposure     |
| `/bills`       | Recurring bill tracker                                                       |
| `/stress`      | Financial Stress Engine — composite score with driver breakdown              |
| `/simulator`   | Purchase Simulator — pre-purchase stress shift + debt-freedom delay          |
| `/forecast`    | Forecast Engine — multi-horizon, multi-scenario projection (job loss, etc.) |
| `/settings`    | Profile (salary, balance, emergency fund, variable spend, currency)          |

## Calculations

`src/lib/calculations.ts` is the deterministic core. EMI amortization uses standard `P·r·(1+r)^n / ((1+r)^n − 1)`. Stress score is a weighted blend:

```
40% EMI/income · 20% debt/annual income · 25% card utilization · 15% (inverted) savings
```

Bands: stable < 30 < warning < 55 < dangerous < 80 < critical.

## Going to APK later

The webapp is structured so an APK wrapper is a follow-up, not a rewrite:

1. **PWA route** — add a manifest + service worker; install as PWA from the browser.
2. **Capacitor route** — `pnpm add @capacitor/core @capacitor/android`, `npx cap init`, point Capacitor at the Next static export, then `npx cap add android && npx cap open android` to build the APK in Android Studio.
3. **Tauri / Expo** — alternatives if a native module (notifications, SMS read, biometrics) becomes essential.

Because the data layer is `localStorage`-backed Zustand, the same store works inside a Capacitor WebView. When Supabase comes in, just swap the persistence middleware.

## What's deferred (per PRD)

- AI layer (`/api/coach` calling Claude / OpenAI) — model wiring later.
- Supabase backend + auth — UI is store-agnostic.
- SMS parsing, bank sync, notifications — depends on native shell.
- Gamification (streaks, milestones, debt-free countdown) — calculations already exist; UI surface to come.

## Native Android (Capacitor)

The Next.js static export (`out/`) is wrapped by a Capacitor Android shell (`android/`, appId `com.noshtek.debtos`). The WebView loads the exact same bundle the E2E suite tests.

```bash
# Requires a JDK (Android Studio's bundled JBR works) and the Android SDK.
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"

pnpm run android:apk     # next build → cap sync android → gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk

# Run on a booted emulator / device:
"$ANDROID_HOME/platform-tools/adb" install -r android/app/build/outputs/apk/debug/app-debug.apk
"$ANDROID_HOME/platform-tools/adb" shell monkey -p com.noshtek.debtos -c android.intent.category.LAUNCHER 1
```

## E2E tests

Playwright drives the production static export on a Pixel-class viewport — the same assets the native WebView serves.

```bash
pnpm build            # produce out/
pnpm run test:e2e     # 13 tests: route smoke (all 9 routes) + functional flows
```

`e2e/smoke.spec.ts` asserts every route hydrates without runtime errors; `e2e/flows.spec.ts` covers demo-data seeding, localStorage persistence across reload, the settings → dashboard flow, and the stress engine.

## Release — Firebase App Distribution

Project: **DebtOS** (`debtos-xdrkz`), Android app `1:962645156475:android:1feed0a086071b6664f8de`.

```bash
firebase appdistribution:distribute android/app/build/outputs/apk/debug/app-debug.apk \
  --app "1:962645156475:android:1feed0a086071b6664f8de" \
  --release-notes "..." \
  --testers "tester@example.com"
```
