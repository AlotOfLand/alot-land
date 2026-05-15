import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchActivities, fetchEntriesForRange, fetchWeekNote,
} from '../lib/queries';
import { addDays, format, toISODate, weekStart as wkStart } from '../lib/dates';

export default function PdfDownloadButton({ weekStart, label = 'Download PDF', className = '' }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function downloadPdf() {
    setBusy(true);
    try {
      // Lazy-load @react-pdf — keeps it out of the initial bundle.
      const [{ pdf }, { default: ReportDocument }, { buildReportData }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../pdf/ReportDocument.jsx'),
        import('../pdf/reportData.js'),
      ]);

      const start = wkStart(new Date(weekStart));
      const end = addDays(start, 6);
      const prevStart = addDays(start, -7);
      const prevEnd = addDays(start, -1);

      const [activities, entries, prevEntries, weekNote] = await Promise.all([
        qc.fetchQuery({ queryKey: ['activities-all-incl-archived'], queryFn: fetchActivities }),
        qc.fetchQuery({
          queryKey: ['entries', toISODate(start)],
          queryFn: () => fetchEntriesForRange(start, end),
        }),
        qc.fetchQuery({
          queryKey: ['entries', toISODate(prevStart)],
          queryFn: () => fetchEntriesForRange(prevStart, prevEnd),
        }),
        qc.fetchQuery({
          queryKey: ['week-note', toISODate(start)],
          queryFn: () => fetchWeekNote(start),
        }),
      ]);

      const data = buildReportData({ weekStart: start, entries, prevEntries, activities });
      const blob = await pdf(
        <ReportDocument weekStart={start} data={data} weekNote={weekNote} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-audit-${format(start, 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('PDF export failed', err);
      alert('PDF export failed. See console for details.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={downloadPdf}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-xl bg-gold text-bg px-4 py-2 text-sm font-medium hover:brightness-110 disabled:opacity-60 transition ${className}`}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
      {busy ? 'Generating…' : label}
    </button>
  );
}
