# MFDA · Multifamily Deal Analyzer

Find, underwrite, and pursue 2–20 unit multifamily deals. Lives at
`mfda.alot.land`, deployed from this subfolder to its own Netlify site (same
model as `time-audit/`).

## Stack
- React 19 + Vite + Tailwind
- Supabase (Postgres + magic-link auth + RLS), multi-tenant (org_id everywhere)
- TanStack Query · `@react-pdf/renderer` (report export) · recharts · date-fns
- **[`@alot/mf-calc`](../packages/mf-calc)** — the frozen, Vitest-locked calc
  engine. Every financial number in the app comes from it (Rule #1: LLMs never
  do arithmetic). Wired via a Vite alias to its TypeScript source, so there's a
  single source of truth and no separate build step.

## What Phase 0 delivers
Sign in → enter a deal → get the full underwrite, all from `mf-calc`:
- 5 valuation methods side-by-side + >15% divergence flag
- 4 financing structures (all-cash / DSCR / agency / seller) + 3-option seller offer
- Inverse solvers: **min down** for targets, **max offer** for targets
- Stress panel (rents −10%, vacancy +5pp, rate +150bps, insurance +30%, combined)
- Tax layer: cost-seg + bonus depreciation, **REP-on vs REP-off both ways**, exit recapture
- Deal-killer prescreen + composite score vs your buy-box → `pursue` flag
- Immutable scenario snapshots (re-running = new version) + assumption/provenance table
- Print-ready **PDF report** export

## One-time setup

### 1. Database
Supabase Dashboard → **SQL Editor** → **New query** → paste all of
[`supabase/schema.sql`](./supabase/schema.sql) → **Run**. This creates every
table (orgs, org_members, invites, markets, deals, units, scenarios, contacts,
cost_ledger) with RLS, the security-definer helpers, the sign-up gate
(`is_email_allowed`), and a trigger that gives each new user an admin-owned org
seeded with AZ (Maricopa) + TN market configs.

### 2. Auth redirect
Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://mfda.alot.land` (+ `http://localhost:5175` for dev)
- **Redirect URLs**: add `https://mfda.alot.land/**` and `http://localhost:5175/**`

Only `david@alot.land` and invited emails can sign in (enforced by
`is_email_allowed`). Admins invite teammates from **Settings**.

### 3. Environment
```bash
cp .env.local.example .env.local && chmod 600 .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 4. Run
```bash
npm install
npm run dev      # http://localhost:5175
npm run build    # production build → dist/
```

## Deploy (Netlify)
Create a new Netlify site from this repo. `netlify.toml` here sets
`base = "mfda/"`, `command = "npm install && npm run build"`,
`publish = "dist"`, and the SPA redirect. Point the `mfda.alot.land` domain at
it and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` as build env vars.

## Architecture notes
- **No arithmetic lives here.** `src/lib/underwrite.js` is a pure orchestrator:
  it assembles inputs and calls `mf-calc`. Both hand-verified reference deals
  reproduce exactly through it.
- **Scenarios are immutable** — the `scenarios` table has no UPDATE/DELETE RLS
  policy. Editing a deal and re-running writes a new snapshot with `calc_version`.
- **Secret / long-running work stays off this app** — per spec, scraping,
  skip-trace, and DD calls run on the droplet via cron. This SPA only ever uses
  the Supabase anon key behind RLS.
- **Deferred to later phases:** data-source adapters (Redfin/assessor/RentCast),
  maps, daily-scan email, off-market list builder + FreedomSoft export, deck
  generator. Compliance fields for contacts already ship in the schema (Rule #9).
