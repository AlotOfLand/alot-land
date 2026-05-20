import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchActivities, fetchEntriesForRange, fetchWeekNote, fetchDayJournalsForRange,
} from '../lib/queries';
import { addDays, format, toISODate, weekStart as wkStart } from '../lib/dates';

/**
 * @param {Date}   date    Anchor date. For week mode, any day in the target week.
 * @param {string} mode    'week' (default) or 'day'
 */
export default function PdfDownloadButton({
  date,
  weekStart,           // legacy prop name still supported
  mode = 'week',
  label = 'Download PDF',
  className = '',
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const anchor = new Date(date ?? weekStart ?? new Date());

  async function downloadPdf() {
    setBusy(true);
    try {
      const [{ pdf }, { default: ReportDocument }, { buildReportData }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../pdf/ReportDocument.jsx'),
        import('../pdf/reportData.js'),
      ]);

      let rangeStart, rangeEnd, prevStart, prevEnd, fileLabel;
      if (mode === 'day') {
        rangeStart = anchor;
        rangeEnd = anchor;
        prevStart = addDays(anchor, -1);
        prevEnd = addDays(anchor, -1);
        fileLabel = format(anchor, 'yyyy-MM-dd');
      } else {
        rangeStart = wkStart(anchor);
        rangeEnd = addDays(rangeStart, 6);
        prevStart = addDays(rangeStart, -7);
        prevEnd = addDays(rangeStart, -1);
        fileLabel = format(rangeStart, 'yyyy-MM-dd');
      }

      const [activities, entries, prevEntries, note, journals] = await Promise.all([
        qc.fetchQuery({ queryKey: ['activities-all-incl-archived'], queryFn: fetchActivities }),
        qc.fetchQuery({
          queryKey: ['entries', toISODate(rangeStart), toISODate(rangeEnd)],
          queryFn: () => fetchEntriesForRange(rangeStart, rangeEnd),
        }),
        qc.fetchQuery({
          queryKey: ['entries', toISODate(prevStart), toISODate(prevEnd)],
          queryFn: () => fetchEntriesForRange(prevStart, prevEnd),
        }),
        mode === 'week'
          ? qc.fetchQuery({ queryKey: ['week-note', toISODate(rangeStart)], queryFn: () => fetchWeekNote(rangeStart) })
          : Promise.resolve(null),
        qc.fetchQuery({
          queryKey: ['day-journals', toISODate(rangeStart), toISODate(rangeEnd)],
          queryFn: () => fetchDayJournalsForRange(rangeStart, rangeEnd),
        }),
      ]);

      const data = buildReportData({ rangeStart, rangeEnd, entries, prevEntries, activities, journals });
      const blob = await pdf(
        <ReportDocument mode={mode} rangeStart={rangeStart} rangeEnd={rangeEnd} data={data} note={note} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-audit-${mode}-${fileLabel}.pdf`;
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
