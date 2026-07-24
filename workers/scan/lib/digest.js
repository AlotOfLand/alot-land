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
        ? `<img src="${esc(d.photo_url)}" width="96" height="72" style="display:block;object-fit:cover;border-radius:8px;" alt=""/>`
        : `<table cellpadding="0" cellspacing="0" style="width:96px;height:72px;background:#F4EFE6;border-radius:8px;"><tr><td align="center" style="color:#B6AD9A;font-size:11px;font-family:Helvetica,Arial,sans-serif;">no photo</td></tr></table>`;
      const meta = [
        d.unit_bucket ? `${d.unit_bucket} units` : null,
        d.year_built ? `built ${d.year_built}` : null,
        d.beds_total ? `${d.beds_total} bd total` : null,
        d.days_on_market != null ? `${d.days_on_market} DOM` : null,
      ].filter(Boolean).join(' &nbsp;·&nbsp; ');
      const agent = d.agent
        ? `<div style="font-size:12px;color:#2E8C43;margin-top:4px;font-family:Helvetica,Arial,sans-serif;">☎ ${esc(d.agent.owner_name || '')}${d.agent.brokerage ? ` · ${esc(d.agent.brokerage)}` : ''}${d.agent.phone ? ` · <a href="tel:${esc(d.agent.phone)}" style="color:#2E8C43;font-weight:bold;text-decoration:none;">${esc(d.agent.phone)}</a>` : ''}</div>`
        : '';
      return `<tr>
        <td style="padding:14px 20px;border-top:1px solid #EFE9DC;">
          <table cellpadding="0" cellspacing="0" width="100%"><tr>
            <td width="108" valign="top"><a href="${link}">${photo}</a></td>
            <td valign="top" style="font-family:Helvetica,Arial,sans-serif;">
              <a href="${link}" style="font-size:15px;font-weight:bold;color:#1A1A1A;text-decoration:none;">${esc(d.address || 'Unknown address')}</a>
              <div style="font-size:12px;color:#8A8272;margin-top:2px;">${esc([d.city, d.state].filter(Boolean).join(', '))}</div>
              <div style="font-size:12px;color:#4A4A4A;margin-top:4px;">${meta}</div>
              ${agent}
            </td>
            <td width="90" valign="top" align="right" style="font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#1A1A1A;white-space:nowrap;">${usd(d.price)}</td>
          </tr></table>
        </td>
      </tr>`;
    })
    .join('\n');

  const health = (scanRuns || [])
    .map((r) => `${r.market}: ${r.ok ? 'ok' : r.blocked ? 'BLOCKED' : 'failed'} · ${r.rows_active} active / ${r.rows_sold} sold · ${r.requests_made} req${r.capped_bands ? ` · ${r.capped_bands} capped bands` : ''}`)
    .join('<br/>') || 'no scans in window';

  const html = `<body style="margin:0;padding:0;background:#F9F6F0;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background:#F9F6F0;padding:24px 12px;"><tr><td align="center">
    <table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 4px 14px;font-family:Georgia,'Times New Roman',serif;">
        <span style="font-size:26px;font-weight:bold;color:#1A1A1A;">MFDA</span><span style="font-size:26px;font-weight:bold;color:#F5B800;">.</span>
        <span style="font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#8A8272;">&nbsp; morning deals · last ${windowHours}h</span>
      </td></tr>
      <tr><td style="background:#FFFFFF;border-radius:14px;border:1px solid #E4DDD0;overflow:hidden;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="height:5px;background:#F5B800;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:18px 20px 6px;font-family:Helvetica,Arial,sans-serif;">
            <div style="font-size:18px;font-weight:bold;color:#1A1A1A;">${count ? `${count} new lead${count === 1 ? '' : 's'} in your buy box` : 'No new leads today'}</div>
            <div style="font-size:12px;color:#8A8272;margin-top:2px;">${count ? 'Sorted by price. Tap any property to underwrite it.' : 'The pipeline still ran — health report below.'}</div>
          </td></tr>
          ${rowsHtml}
          <tr><td align="center" style="padding:20px;">
            <a href="${appUrl}/on-market" style="display:inline-block;background:#F5B800;color:#1A1A1A;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;padding:12px 26px;border-radius:10px;text-decoration:none;">Open the full queue →</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:14px 8px;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#8A8272;line-height:1.5;">
        <b>Scan health</b><br/>${health}<br/><br/>
        Estimates only — not an offer. Verify tax positions with a CPA. &nbsp;MFDA · Alot Of Land
      </td></tr>
    </table>
  </td></tr></table>
</body>`;

  const text = [
    subject,
    '',
    ...deals.map((d) => `- ${d.address}, ${d.city} ${d.state} · ${d.unit_bucket}u · ${usd(d.price)} · ${appUrl}/deals/${d.id}`),
    '',
    `Queue: ${appUrl}/on-market`,
  ].join('\n');

  return { subject, html, text, count };
}
