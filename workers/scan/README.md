# MFDA Scanner · Redfin lane

Fills the app's **On-Market** queue (active listings → `deals` as leads) and
the comps store (sold listings → `comps`). Runs on the operator's laptop or the
droplet — **never** in the browser app, because it uses the Supabase
service-role key and talks to Redfin directly.

Scraping internals are generalized from `AlotOfLand/redfin-comps`
(`HANDOFF-MFDA.md` there). Inherited hard rules: normal-browser UA, 1 request
per 1.5s globally, no CAPTCHA solving / proxies / evasion, stop on block.

## Known data limits (from the handoff — not bugs)

- **No unit counts.** Redfin only says `2-4` or `5+`. A "5+" row can be 5 or
  200 units — verify before underwriting. The app labels this.
- Phoenix hits Redfin's 350-row cap instantly → the scanner auto-splits by
  price bands and records any still-capped bands in `scan_runs.capped_bands`.
- No listing-agent name/phone in the CSV; no APN. Sqft ~9% filled in Phoenix;
  sold dates absent for Nashville MF.

## One-time setup

```bash
cd workers/scan
npm install
cp .env.example .env && chmod 600 .env
# Fill in:
#   SUPABASE_URL              (same as the app's)
#   SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API → service_role)
```

The service-role key bypasses RLS. It lives in this `.env` and on the droplet
only. If it ever leaks, rotate it in the same dashboard page.

## Run

```bash
set -a; source .env; set +a           # load env into the shell
npm run scan -- --market phoenix   --status both      # active + sold(1yr)
npm run scan -- --market nashville --status both
npm run scan -- --market phoenix --status sold --days 730
npm run scan -- --market phoenix --status active --dry-run   # no DB writes
```

Then refresh the app → **On-Market** shows the lead queue; each **Analyze**
click moves a lead into underwriting. Sold rows land in `comps`. Every run
writes a `scan_runs` health row (requests, rows, capped bands, blocked flag)
and a $0 `cost_ledger` entry.

**If it prints BLOCKED:** stop. Don't re-run in a loop. Wait an hour and try
once; if persistent we fall back to manual CSV download from redfin.com (same
parser) — ask in the build chat.

## Droplet cron (later)

```cron
# staggered per spec: one state per run
15 5 * * *  cd /opt/alot/alot-land/workers/scan && /usr/bin/node bin/scan.mjs --market phoenix   --status both >> /var/log/mfda-scan.log 2>&1
45 5 * * *  cd /opt/alot/alot-land/workers/scan && /usr/bin/node bin/scan.mjs --market nashville --status both >> /var/log/mfda-scan.log 2>&1
```

Env for cron: put the same two variables in `/etc/environment` or a systemd
unit — not in the crontab line.

## Tests

```bash
npm test   # 26 assertions: CSV quirks (PAST SALE trap, disclaimer row,
           # non-MF leakage), URL parameter contract, band-splitting coverage
```

Adding a market = one entry in `lib/markets.js` (closed polygon ring
"lng lat,..." — corners of a bounding box). No code changes.
