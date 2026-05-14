# Time Audit · A Lot of Land

A private dark-themed time-audit web app. Log activities against value tiers ($10K / $1K / $10–99 / $0 per hour), see where your week actually went, and reflect with weekly prompts. Data lives in Supabase so history follows you across devices.

Lives at `time.alot.land` — deployed from this subfolder to its own Netlify site.

## Stack
- React 19 + Vite + Tailwind
- Supabase (Postgres + magic-link auth + RLS)
- TanStack Query + recharts + date-fns

## One-time setup (do this once before first run)

### 1. Run the database schema

1. Open your Supabase project dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.
3. **Then run** [`supabase/migration_002_timeline.sql`](./supabase/migration_002_timeline.sql) in a new query (adds the `day_journal` table for wake-up times and adds `'block'` as a valid `time_entries.source`).

This creates the `activities`, `time_entries`, `week_notes`, `active_timers`, and `day_journal` tables with row-level security so only the signed-in user can see their own data. It also installs a trigger that auto-seeds your 39 activities from the spreadsheet the first time you sign in.

### 2. Configure auth redirect

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `https://time.alot.land` (and `http://localhost:5174` for local dev)
- **Redirect URLs**: add both `https://time.alot.land/**` and `http://localhost:5174/**`

### 3. (Optional) Lock down to one email

After signing in once, go to **Authentication → Sign In / Up → Email** and **disable new sign-ups**. Combined with the client-side allow-list (set via `VITE_ALLOWED_EMAIL`), this prevents anyone but you from creating an account.

## Local development

```bash
cd time-audit
npm install
npm run dev
```

Open http://localhost:5174 → sign in with your email → click the magic link.

`.env.local` already contains the Supabase project URL, the publishable anon key, and the allowed email. Don't commit it (it's gitignored).

## Deploy

Create a new Netlify site pointed at this folder:

1. Netlify → **Add new site → Import from Git → pick the alot-land repo**.
2. **Base directory**: `time-audit`
3. **Build command**: `npm install && npm run build`
4. **Publish directory**: `time-audit/dist`
5. **Environment variables** (Site settings → Environment variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ALLOWED_EMAIL`
6. **Domain settings → Add custom domain**: `time.alot.land`
7. Add a **CNAME record** at your DNS provider:
   - Name: `time`
   - Value: `<your-site>.netlify.app`
   - (Netlify will show the exact value to use)

Once DNS propagates (usually <10 min), HTTPS auto-provisions and the site is live at `time.alot.land`.

## What's in the box (MVP)

- **Today** — two view modes via toggle:
  - **Timeline**: set wake-up time, then chain time blocks through your day. Each block has a start time, duration, and an autocomplete activity picker that auto-categorizes by tier. Type a brand-new activity and you can create + tier it inline. Gaps between blocks show as `unlogged Nm`.
  - **Buckets**: classic tier-grouped quick-tap minute entry. Each row has a `min` input + Log button, plus a hover-revealed ▶ to start the live timer (singleton, survives tab close).
- **Week** — Thursday→Wednesday grid like your xlsx, edit any cell, with tier totals and two prompts (focus & reflection) saved per week. PDF export button in the top-right.
- **Trends** — 4/8/12-week stacked bars by tier + a $10K-share line chart (the number that actually matters).
- **Reports** — list of every tracked week (last 12) with one-click **PDF download**. Branded one-page printable audit with headline stats, tier breakdown, top activities, daily-hour bars, and your focus/reflection prompts.
- **Settings** — add/rename/retier/archive activities.

## Coming next (round 2)
- History page (browse past weeks side-by-side)
- Export any week to xlsx in the original template format
- Compare two weeks
- Mobile-tuned bottom-tab nav

## Schema overview

| Table | Purpose |
|-------|---------|
| `activities` | Your activity list, grouped by tier, with sort order. Archive (don't delete) to keep history intact. |
| `time_entries` | One row per logged session. Has `occurred_on` (date), `minutes`, `source` ('manual' or 'timer'). |
| `week_notes` | One row per week (Thu start). Stores focus & reflection prompts. |
| `active_timers` | Singleton per user — the currently running timer (if any). |

All tables are protected by RLS policies: `auth.uid() = user_id`.
