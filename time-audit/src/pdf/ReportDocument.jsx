import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from '../lib/dates';

Font.register({
  family: 'Fraunces',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2WiIWiHbpdg.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2WiIfiHbpdg.ttf', fontWeight: 700 },
  ],
});
Font.register({
  family: 'DM Sans',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZOIGTWFhVqJzy0u.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZ2IGTWFhVqJzy0u.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/dmsans/v15/rP2Hp2ywxg089UriCZawHTWFhVqJzy0u.ttf', fontWeight: 700 },
  ],
});

const COLORS = {
  bg: '#FFFFFF',
  ink: '#0A0A0A',
  muted: '#666666',
  border: '#E5E5E5',
  borderLite: '#F0F0F0',
  gold: '#B88A00',     // print-safe darker gold
  green: '#2E8B47',
  blue: '#3F7AB8',
  grey: '#6E6E6E',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'DM Sans',
    color: COLORS.ink,
    backgroundColor: COLORS.bg,
    padding: 36,
    fontSize: 10,
    lineHeight: 1.4,
  },
  hRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12, marginBottom: 20 },
  brand: { fontFamily: 'Fraunces', fontWeight: 700, fontSize: 18, letterSpacing: 0.5 },
  brandSub: { fontSize: 8, color: COLORS.muted, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },
  weekRange: { fontFamily: 'Fraunces', fontSize: 22, fontWeight: 700 },
  weekDates: { fontSize: 9, color: COLORS.muted, marginTop: 2 },

  headline: { flexDirection: 'row', gap: 20, marginBottom: 18 },
  bigStat: { flex: 1, padding: 14, borderLeftWidth: 4, borderLeftStyle: 'solid', borderLeftColor: COLORS.border, backgroundColor: '#FAFAFA' },
  bigStatNum: { fontFamily: 'Fraunces', fontSize: 28, fontWeight: 700 },
  bigStatLabel: { fontSize: 8, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 4 },
  bigStatDelta: { fontSize: 9, marginTop: 6 },

  sectionTitle: { fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.muted, marginBottom: 8 },
  section: { marginBottom: 18 },

  // Tier rows
  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottom: `0.5px solid ${COLORS.borderLite}` },
  tierDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  tierLabel: { flex: 1, fontSize: 10 },
  tierHrs: { width: 60, textAlign: 'right', fontSize: 10, fontWeight: 500 },
  tierPct: { width: 50, textAlign: 'right', fontSize: 10, color: COLORS.muted },
  tierDelta: { width: 70, textAlign: 'right', fontSize: 9, color: COLORS.muted },

  // Top activities
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  topRank: { width: 16, fontSize: 9, color: COLORS.muted },
  topName: { flex: 1, fontSize: 10 },
  topBar: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginRight: 8, flex: 1, marginLeft: 8 },
  topBarFill: { height: 6, borderRadius: 3 },
  topHrs: { width: 50, textAlign: 'right', fontSize: 10, fontWeight: 500 },

  // Day bars
  dayBars: { flexDirection: 'row', gap: 8, marginTop: 8 },
  dayCol: { flex: 1, alignItems: 'center' },
  dayBarStack: { width: 28, height: 110, justifyContent: 'flex-end', backgroundColor: '#FAFAFA', borderRadius: 4, overflow: 'hidden' },
  daySeg: { width: '100%' },
  dayLabel: { fontSize: 9, marginTop: 4 },
  daySub: { fontSize: 8, color: COLORS.muted },
  dayTotal: { fontSize: 9, fontWeight: 500, marginTop: 2 },

  // Prompts
  prompt: { padding: 12, backgroundColor: '#FAFAFA', borderLeftWidth: 4, borderLeftStyle: 'solid', marginBottom: 8 },
  promptLabel: { fontSize: 8, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  promptBody: { fontSize: 11, lineHeight: 1.5 },
  promptEmpty: { fontSize: 10, color: COLORS.muted, fontStyle: 'italic' },

  // Two-col helper
  twoCol: { flexDirection: 'row', gap: 24 },
  col: { flex: 1 },

  // Footer
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: COLORS.muted, borderTop: `0.5px solid ${COLORS.borderLite}`, paddingTop: 8 },
});

function fmtHours(n) {
  if (!n) return '—';
  return n.toFixed(1) + 'h';
}

function fmtDelta(n, unit = 'h') {
  if (Math.abs(n) < 0.05) return '—';
  const sign = n > 0 ? '▲' : '▼';
  return `${sign} ${Math.abs(n).toFixed(1)}${unit}`;
}

export default function ReportDocument({ weekStart, data, weekNote }) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const colorFor = (key) => {
    if (key === 'tier_10k') return COLORS.gold;
    if (key === 'tier_1k') return COLORS.green;
    if (key === 'tier_mid') return COLORS.blue;
    return COLORS.grey;
  };

  return (
    <Document title={`Time Audit · ${format(weekStart, 'MMM d')}–${format(weekEnd, 'MMM d, yyyy')}`}>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.hRow}>
          <View>
            <Text style={s.brand}>Time Audit</Text>
            <Text style={s.brandSub}>A Lot of Land</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.weekRange}>
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </Text>
            <Text style={s.weekDates}>Thursday → Wednesday</Text>
          </View>
        </View>

        {/* Headline numbers */}
        <View style={s.headline}>
          <View style={[s.bigStat, { borderLeftColor: COLORS.ink }]}>
            <Text style={s.bigStatNum}>{fmtHours(data.totalHours)}</Text>
            <Text style={s.bigStatLabel}>Tracked this week</Text>
            <Text style={s.bigStatDelta}>{fmtDelta(data.totalHours - data.prevTotalHours)} vs prior week</Text>
          </View>
          <View style={[s.bigStat, { borderLeftColor: COLORS.gold }]}>
            <Text style={[s.bigStatNum, { color: COLORS.gold }]}>{data.tenKShare.toFixed(0)}%</Text>
            <Text style={s.bigStatLabel}>At $10K / hour</Text>
            <Text style={s.bigStatDelta}>{fmtDelta(data.tenKShareDelta, 'pts')} vs prior week</Text>
          </View>
          <View style={[s.bigStat, { borderLeftColor: COLORS.green }]}>
            <Text style={s.bigStatNum}>
              {(data.tier.find((t) => t.key === 'tier_10k')?.hours +
                data.tier.find((t) => t.key === 'tier_1k')?.hours || 0
              ).toFixed(1)}h
            </Text>
            <Text style={s.bigStatLabel}>$10K + $1K combined</Text>
            <Text style={s.bigStatDelta}>The high-leverage zone</Text>
          </View>
        </View>

        {/* Tier breakdown */}
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

        {/* Two columns: top activities + daily bars */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.sectionTitle}>Top activities</Text>
            {data.topActivities.length === 0 ? (
              <Text style={s.promptEmpty}>No activities logged yet.</Text>
            ) : (
              data.topActivities.map((a, i) => {
                const maxHr = data.topActivities[0]?.hours || 1;
                const pct = (a.hours / maxHr) * 100;
                return (
                  <View key={i} style={s.topRow}>
                    <Text style={s.topRank}>{i + 1}.</Text>
                    <Text style={s.topName}>{a.name}</Text>
                    <View style={s.topBar}>
                      <View style={[s.topBarFill, { width: `${pct}%`, backgroundColor: colorFor(a.tier) }]} />
                    </View>
                    <Text style={s.topHrs}>{fmtHours(a.hours)}</Text>
                  </View>
                );
              })
            )}
          </View>

          <View style={s.col}>
            <Text style={s.sectionTitle}>Hours per day</Text>
            <View style={s.dayBars}>
              {data.dayBars.map((d) => {
                const heightPct = data.maxDayMin ? (d.total / data.maxDayMin) * 100 : 0;
                return (
                  <View key={d.iso} style={s.dayCol}>
                    <View style={s.dayBarStack}>
                      {['tier_zero', 'tier_mid', 'tier_1k', 'tier_10k'].map((k) => {
                        const m = d.tierTotals[k];
                        if (!m) return null;
                        const segPct = data.maxDayMin ? (m / data.maxDayMin) * 100 : 0;
                        return (
                          <View
                            key={k}
                            style={[s.daySeg, {
                              height: `${segPct}%`,
                              backgroundColor: colorFor(k),
                            }]}
                          />
                        );
                      })}
                    </View>
                    <Text style={s.dayLabel}>{d.label}</Text>
                    <Text style={s.daySub}>{d.sub}</Text>
                    <Text style={s.dayTotal}>{d.totalHours ? d.totalHours.toFixed(1) + 'h' : '—'}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Prompts */}
        <View style={[s.section, { marginTop: 18 }]}>
          <View style={s.twoCol}>
            <View style={s.col}>
              <View style={[s.prompt, { borderLeftColor: COLORS.gold }]}>
                <Text style={[s.promptLabel, { color: COLORS.gold }]}>Focus this week</Text>
                {weekNote?.focus ? (
                  <Text style={s.promptBody}>{weekNote.focus}</Text>
                ) : (
                  <Text style={s.promptEmpty}>(no focus set)</Text>
                )}
              </View>
            </View>
            <View style={s.col}>
              <View style={[s.prompt, { borderLeftColor: COLORS.green }]}>
                <Text style={[s.promptLabel, { color: COLORS.green }]}>Reflection</Text>
                {weekNote?.reflection ? (
                  <Text style={s.promptBody}>{weekNote.reflection}</Text>
                ) : (
                  <Text style={s.promptEmpty}>(no reflection)</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>Time Audit · A Lot of Land</Text>
          <Text>Generated {format(new Date(), 'MMM d, yyyy h:mm a')}</Text>
        </View>
      </Page>
    </Document>
  );
}
