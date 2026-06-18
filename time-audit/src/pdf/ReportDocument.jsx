import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { format, fmtTime, fmtMin } from '../lib/dates';

const BODY = 'Helvetica';
const DISPLAY = 'Times-Roman';

const COLORS = {
  bg: '#FFFFFF',
  ink: '#0A0A0A',
  muted: '#666666',
  border: '#E5E5E5',
  borderLite: '#F0F0F0',
  panel: '#FAFAFA',
  gold: '#B88A00',
  green: '#2E8B47',
  blue: '#3F7AB8',
  grey: '#6E6E6E',
};

const colorFor = (key) => {
  if (key === 'tier_10k') return COLORS.gold;
  if (key === 'tier_1k') return COLORS.green;
  if (key === 'tier_mid') return COLORS.blue;
  return COLORS.grey;
};

const s = StyleSheet.create({
  page: { fontFamily: BODY, color: COLORS.ink, backgroundColor: COLORS.bg, padding: 40, fontSize: 10 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 14, marginBottom: 22,
  },
  brand: { fontFamily: DISPLAY, fontSize: 18, lineHeight: 1.1 },
  brandSub: { fontSize: 8, color: COLORS.muted, letterSpacing: 2, textTransform: 'uppercase', marginTop: 6, lineHeight: 1.2 },
  rangeTitle: { fontFamily: DISPLAY, fontSize: 18, lineHeight: 1.1, textAlign: 'right' },
  rangeSub: { fontSize: 9, color: COLORS.muted, marginTop: 5, textAlign: 'right', lineHeight: 1.2 },

  headline: { flexDirection: 'row', marginBottom: 22 },
  bigStat: {
    flex: 1, paddingTop: 14, paddingBottom: 14, paddingLeft: 14, paddingRight: 14,
    borderLeftWidth: 4, borderLeftColor: COLORS.border, backgroundColor: COLORS.panel, marginRight: 10,
  },
  bigStatLast: { marginRight: 0 },
  bigStatNum: { fontFamily: DISPLAY, fontSize: 26, lineHeight: 1.1, marginBottom: 6 },
  bigStatLabel: { fontSize: 8, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1.2, lineHeight: 1.3, marginBottom: 4 },
  bigStatDelta: { fontSize: 9, color: COLORS.muted, lineHeight: 1.3 },

  sectionTitle: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.muted, marginBottom: 10, lineHeight: 1.2 },
  section: { marginBottom: 20 },

  tierRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLite },
  tierDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  tierLabel: { flex: 1, fontSize: 10, lineHeight: 1.3 },
  tierHrs: { width: 60, textAlign: 'right', fontSize: 10, lineHeight: 1.3 },
  tierPct: { width: 50, textAlign: 'right', fontSize: 10, color: COLORS.muted, lineHeight: 1.3 },
  tierDelta: { width: 70, textAlign: 'right', fontSize: 9, color: COLORS.muted, lineHeight: 1.3 },

  twoCol: { flexDirection: 'row' },
  colLeft: { flex: 1, marginRight: 18 },
  colRight: { flex: 1 },

  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  topRank: { width: 14, fontSize: 9, color: COLORS.muted, lineHeight: 1.3 },
  topName: { width: 120, fontSize: 10, lineHeight: 1.3, paddingRight: 6 },
  topBarWrap: { flex: 1, height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginRight: 10, overflow: 'hidden' },
  topBarFill: { height: 6, borderRadius: 3 },
  topHrs: { width: 40, textAlign: 'right', fontSize: 10, lineHeight: 1.3 },

  dayBars: { flexDirection: 'row', marginTop: 4 },
  dayCol: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  dayBarStack: { width: 22, height: 90, flexDirection: 'column-reverse', backgroundColor: COLORS.panel, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  daySeg: { width: '100%' },
  dayLabel: { fontSize: 9, lineHeight: 1.2 },
  daySub: { fontSize: 8, color: COLORS.muted, lineHeight: 1.2, marginTop: 1 },
  dayTotal: { fontSize: 9, color: COLORS.ink, lineHeight: 1.2, marginTop: 3 },

  promptRow: { flexDirection: 'row', marginTop: 6 },
  prompt: { flex: 1, paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14, backgroundColor: COLORS.panel, borderLeftWidth: 4 },
  promptLabel: { fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, lineHeight: 1.3 },
  promptBody: { fontSize: 10, lineHeight: 1.5 },
  promptEmpty: { fontSize: 10, color: COLORS.muted, fontStyle: 'italic', lineHeight: 1.5 },

  // ---- Detail pages ----
  dayHeader: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: COLORS.ink, paddingBottom: 6, marginTop: 18, marginBottom: 4,
  },
  dayHeaderTitle: { fontFamily: DISPLAY, fontSize: 15, lineHeight: 1.1 },
  dayHeaderMeta: { fontSize: 9, color: COLORS.muted, lineHeight: 1.2 },

  itemHead: { flexDirection: 'row', paddingTop: 6, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLite },
  itemHeadCell: { fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.muted },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 5, paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLite },
  colTime: { width: 110, fontSize: 9.5, lineHeight: 1.3 },
  colDur: { width: 60, fontSize: 9.5, lineHeight: 1.3 },
  colAct: { flex: 1, paddingRight: 8 },
  actName: { fontSize: 9.5, lineHeight: 1.3 },
  actNote: { fontSize: 8.5, color: COLORS.muted, lineHeight: 1.3, marginTop: 1 },
  colTier: { width: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  tierTag: { fontSize: 8, color: COLORS.muted },
  miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },

  dayEmpty: { fontSize: 9, color: COLORS.muted, fontStyle: 'italic', paddingTop: 6, paddingBottom: 6 },
  dayFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6 },
  dayFooterText: { fontSize: 9.5, fontWeight: 700 },

  footer: {
    position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row',
    justifyContent: 'space-between', fontSize: 8, color: COLORS.muted,
    borderTopWidth: 0.5, borderTopColor: COLORS.borderLite, paddingTop: 8,
  },
  footerText: { fontSize: 8, color: COLORS.muted, lineHeight: 1.3 },
});

function fmtHours(n) {
  if (!n) return '0.0h';
  return n.toFixed(1) + 'h';
}
function fmtDelta(n, unit = 'h') {
  if (Math.abs(n) < 0.05) return '—';
  return `${n > 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}${unit}`;
}

export default function ReportDocument({ mode = 'week', rangeStart, rangeEnd, data, note }) {
  const isWeek = mode === 'week';
  const tenKHrs = data.tier.find((t) => t.key === 'tier_10k')?.hours || 0;
  const oneKHrs = data.tier.find((t) => t.key === 'tier_1k')?.hours || 0;
  const priorLabel = isWeek ? 'vs prior week' : 'vs prior day';

  const rangeTitle = isWeek
    ? `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`
    : format(rangeStart, 'EEEE, MMM d, yyyy');

  const daysWithData = data.dayDetails.filter((d) => d.items.length > 0);

  const docTitle = isWeek
    ? `Time Audit · ${format(rangeStart, 'MMM d')}-${format(rangeEnd, 'MMM d, yyyy')}`
    : `Time Audit · ${format(rangeStart, 'MMM d, yyyy')}`;

  return (
    <Document title={docTitle}>
      {/* ---------- PAGE 1 · SNAPSHOT ---------- */}
      <Page size="LETTER" style={s.page} wrap={false}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Time Audit</Text>
            <Text style={s.brandSub}>Powered by Alot.Land</Text>
          </View>
          <View>
            <Text style={s.rangeTitle}>{rangeTitle}</Text>
            <Text style={s.rangeSub}>{isWeek ? 'Thursday — Wednesday' : 'Daily report'}</Text>
          </View>
        </View>

        <View style={s.headline}>
          <View style={[s.bigStat, { borderLeftColor: COLORS.ink }]}>
            <Text style={s.bigStatNum}>{fmtHours(data.totalHours)}</Text>
            <Text style={s.bigStatLabel}>{isWeek ? 'Tracked this week' : 'Tracked this day'}</Text>
            <Text style={s.bigStatDelta}>{fmtDelta(data.totalHours - data.prevTotalHours)} {priorLabel}</Text>
          </View>
          <View style={[s.bigStat, { borderLeftColor: COLORS.gold }]}>
            <Text style={[s.bigStatNum, { color: COLORS.gold }]}>{data.tenKShare.toFixed(0)}%</Text>
            <Text style={s.bigStatLabel}>At $10K / hour</Text>
            <Text style={s.bigStatDelta}>{fmtDelta(data.tenKShareDelta, 'pts')} {priorLabel}</Text>
          </View>
          <View style={[s.bigStat, s.bigStatLast, { borderLeftColor: COLORS.green }]}>
            <Text style={s.bigStatNum}>{(tenKHrs + oneKHrs).toFixed(1)}h</Text>
            <Text style={s.bigStatLabel}>$10K + $1K combined</Text>
            <Text style={s.bigStatDelta}>The high-leverage zone</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>By tier</Text>
          {data.tier.map((t) => (
            <View style={s.tierRow} key={t.key}>
              <View style={[s.tierDot, { backgroundColor: colorFor(t.key) }]} />
              <Text style={s.tierLabel}>{t.label}</Text>
              <Text style={s.tierHrs}>{fmtHours(t.hours)}</Text>
              <Text style={s.tierPct}>{t.pct.toFixed(0)}%</Text>
              <Text style={s.tierDelta}>{fmtDelta(t.deltaHours)}</Text>
            </View>
          ))}
        </View>

        <View style={[s.twoCol, s.section]}>
          <View style={isWeek ? s.colLeft : { flex: 1 }}>
            <Text style={s.sectionTitle}>Top activities</Text>
            {data.topActivities.length === 0 ? (
              <Text style={s.promptEmpty}>No activities logged.</Text>
            ) : (
              data.topActivities.map((a, i) => {
                const maxHr = data.topActivities[0]?.hours || 1;
                const pct = Math.min(100, (a.hours / maxHr) * 100);
                return (
                  <View key={i} style={s.topRow}>
                    <Text style={s.topRank}>{i + 1}.</Text>
                    <Text style={s.topName}>{a.name}</Text>
                    <View style={s.topBarWrap}>
                      <View style={[s.topBarFill, { width: `${pct}%`, backgroundColor: colorFor(a.tier) }]} />
                    </View>
                    <Text style={s.topHrs}>{fmtHours(a.hours)}</Text>
                  </View>
                );
              })
            )}
          </View>

          {isWeek && (
            <View style={s.colRight}>
              <Text style={s.sectionTitle}>Hours per day</Text>
              <View style={s.dayBars}>
                {data.dayBars.map((d) => (
                  <View key={d.iso} style={s.dayCol}>
                    <View style={s.dayBarStack}>
                      {['tier_zero', 'tier_mid', 'tier_1k', 'tier_10k'].map((k) => {
                        const m = d.tierTotals[k];
                        if (!m) return null;
                        const segPct = data.maxDayMin ? (m / data.maxDayMin) * 100 : 0;
                        return <View key={k} style={[s.daySeg, { height: `${segPct}%`, backgroundColor: colorFor(k) }]} />;
                      })}
                    </View>
                    <Text style={s.dayLabel}>{d.label}</Text>
                    <Text style={s.daySub}>{d.sub}</Text>
                    <Text style={s.dayTotal}>{d.totalHours ? d.totalHours.toFixed(1) + 'h' : '—'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {isWeek && (
          <View style={s.section}>
            <View style={s.promptRow}>
              <View style={[s.prompt, { borderLeftColor: COLORS.gold, marginRight: 10 }]}>
                <Text style={[s.promptLabel, { color: COLORS.gold }]}>Focus this week</Text>
                {note?.focus ? <Text style={s.promptBody}>{note.focus}</Text> : <Text style={s.promptEmpty}>(no focus set)</Text>}
              </View>
              <View style={[s.prompt, { borderLeftColor: COLORS.green }]}>
                <Text style={[s.promptLabel, { color: COLORS.green }]}>Reflection</Text>
                {note?.reflection ? <Text style={s.promptBody}>{note.reflection}</Text> : <Text style={s.promptEmpty}>(no reflection)</Text>}
              </View>
            </View>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Time Audit · Powered by Alot.Land</Text>
          <Text style={s.footerText}>Generated {format(new Date(), 'MMM d, yyyy h:mm a')}</Text>
        </View>
      </Page>

      {/* ---------- DETAIL PAGES ---------- */}
      <Page size="LETTER" style={s.page}>
        <Text style={[s.sectionTitle, { marginBottom: 2 }]}>
          {isWeek ? 'Daily detail' : 'Activity log'}
        </Text>

        {daysWithData.length === 0 ? (
          <Text style={s.dayEmpty}>No activities were logged in this period.</Text>
        ) : (
          daysWithData.map((day) => (
            <View key={day.iso}>
              <View style={s.dayHeader} wrap={false}>
                <Text style={s.dayHeaderTitle}>{day.dateLong}</Text>
                <Text style={s.dayHeaderMeta}>
                  {day.wakeAt ? `Woke ${fmtTime(day.wakeAt)} · ` : ''}
                  {day.sleptMinutes ? `Slept ${fmtMin(day.sleptMinutes)} · ` : ''}
                  {fmtMin(day.total)} logged
                </Text>
              </View>

              <View style={s.itemHead} wrap={false}>
                <Text style={[s.itemHeadCell, { width: 110 }]}>Time</Text>
                <Text style={[s.itemHeadCell, { width: 60 }]}>Length</Text>
                <Text style={[s.itemHeadCell, { flex: 1 }]}>Activity</Text>
                <Text style={[s.itemHeadCell, { width: 60, textAlign: 'right' }]}>Tier</Text>
              </View>

              {day.items.map((it, idx) => {
                const endMs = it.endedAt
                  ? new Date(it.endedAt)
                  : it.startedAt
                    ? new Date(new Date(it.startedAt).getTime() + it.minutes * 60000)
                    : null;
                const timeLabel = it.startedAt
                  ? `${fmtTime(it.startedAt)}–${fmtTime(endMs)}`
                  : '—';
                return (
                  <View key={idx} style={s.itemRow} wrap={false}>
                    <Text style={s.colTime}>{timeLabel}</Text>
                    <Text style={s.colDur}>{fmtMin(it.minutes)}</Text>
                    <View style={s.colAct}>
                      <Text style={s.actName}>{it.name}</Text>
                      {it.notes ? <Text style={s.actNote}>{it.notes}</Text> : null}
                    </View>
                    <View style={s.colTier}>
                      <View style={[s.miniDot, { backgroundColor: colorFor(it.tier) }]} />
                      <Text style={s.tierTag}>{it.short}</Text>
                    </View>
                  </View>
                );
              })}

              <View style={s.dayFooter} wrap={false}>
                <Text style={s.dayFooterText}>{fmtMin(day.total)} · {fmtHours(day.totalHours)}</Text>
              </View>
            </View>
          ))
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Time Audit · Powered by Alot.Land</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
