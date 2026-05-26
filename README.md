# DebtOS

A predictive financial survival platform — EMI stacking, cashflow forecasting, stress scoring, and behavioral simulation.

> DebtOS is not an expense tracker. DebtOS is a financial operating system designed to predict and prevent financial collapse caused by EMI stacking and invisible future obligations.

## Live

Once Pages is enabled on the repo, it lives at:
**https://khalidnoshtek.github.io/DebtOS/**

## Structure

- [PRD/](PRD/) — product requirements document
- [web/](web/) — Next.js 16 webapp (App Router, Tailwind v4, Zustand, Framer Motion, Recharts)
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) — auto-deploys `web/` as a static export to GitHub Pages on push to `main`

## Run locally

```bash
cd web
pnpm install
pnpm dev   # http://localhost:3000
```

Click **Load demo data** in the top bar to populate realistic numbers.

See [web/README.md](web/README.md) for the full module map and APK migration path.
