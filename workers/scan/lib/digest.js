/**
 * Morning deals digest — pure composer (no I/O, fully testable).
 * Standalone email per spec: new deals since the last cycle, one line each,
 * plus the scan-health footer. NO arithmetic beyond counting — all deal
 * numbers come straight from stored rows.
 */

function usd(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * @param deals   new lead rows (created within the window), each optionally
 *                with .agent {owner_name, brokerage, phone}
 * @param scanRuns recent scan_runs rows for the health footer
 * @param appUrl  e.g. https://mfda.alot.land
 */
export function buildDigest({ deals, scanRuns, appUrl, windowHours }) {
  const count = deals.length;
  const subject = count
    ? `MFDA: ${count} new multifamily lead${count === 1 ? '' : 's'} (${deals.map((d) => d.state).filter((v, i, a) => v && a.indexOf(v) === i).join('/')})`
    : 'MFDA: no new multifamily leads today';

  const rowsHtml = deals
    .map((d) => {
      const link = `${appUrl}/deals/${d.id}`;
      const photo = d.photo_url
        ? `<img src="${esc(d.photo_url)}" width="72" height="54" style="object-fit:cover;border-radius:6px;" alt=""/>`
        : `<div style="width:72px;height:54px;background:#F4EFE6;border-radius:6px;"></div>`;
      const agent = d.agent
        ? `<div style="font-size:12px;color:#2E8C43;">☎ ${esc(d.agent.owner_name || '')}${d.agent.phone ? ` · ${esc(d.agent.phone)}` : ''}</div>`
        : '';
      return `<tr>
        <td style="padding:8px 10px 8px 0;">${photo}</td>
        <td style="padding:8px 0;">
          <a href="${link}" style="font-weight:600;color:#1A1A1A;text-decoration:none;">${esc(d.address || 'Unknown address')}</a>
          <div style="font-size:12px;color:#8A8272;">${esc([d.city, d.state].filter(Boolean).join(', '))} · ${esc(d.unit_bucket || '?')} units${d.year_built ? ` · ${d.year_built}` : ''}${d.beds_total ? ` · ${d.beds_total} bd` : ''}${d.days_on_market != null ? ` · ${d.days_on_market} DOM` : ''}</div>
          ${agent}
        </td>
        <td style="padding:8px 0 8px 10px;text-align:right;font-weight:600;white-space:nowrap;">${usd(d.price)}</td>
      </tr>`;
    })
    .join('\n');

  const health = (scanRuns || [])
    .map((r) => `${r.market}: ${r.ok ? 'ok' : r.blocked ? 'BLOCKED' : 'failed'} · ${r.rows_active} active / ${r.rows_sold} sold · ${r.requests_made} req${r.capped_bands ? ` · ${r.capped_bands} capped bands` : ''}`)
    .join('<br/>') || 'no scans in window';

  const html = `<div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1A1A1A;">
  <div style="padding:16px 0;border-bottom:2px solid #F5B800;">
    <span style="font-size:22px;font-weight:700;">MFDA<span style="color:#F5B800;">.</span></span>
    <span style="font-size:13px;color:#8A8272;margin-left:8px;">morning deals · last ${windowHours}h</span>
  </div>
  ${count ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${rowsHtml}</table>` : `<p style="color:#8A8272;">No new leads hit the queue. The pipeline still ran — health below.</p>`}
  <div style="margin-top:16px;"><a href="${appUrl}/on-market" style="background:#F5B800;color:#1A1A1A;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">Open the queue →</a></div>
  <div style="margin-top:20px;padding-top:10px;border-top:1px solid #E4DDD0;font-size:11px;color:#8A8272;">
    Scan health<br/>${health}<br/><br/>Estimates only — not an offer. MFDA · Alot Of Land
  </div>
</div>`;

  const text = [
    subject,
    '',
    ...deals.map((d) => `- ${d.address}, ${d.city} ${d.state} · ${d.unit_bucket}u · ${usd(d.price)} · ${appUrl}/deals/${d.id}`),
    '',
    `Queue: ${appUrl}/on-market`,
  ].join('\n');

  return { subject, html, text, count };
}
