import {
  addDays, format, parseISO, startOfDay, differenceInCalendarDays,
  isSameDay, isToday as fnsIsToday,
} from 'date-fns';

// Week runs Thursday → Wednesday (David's template).
// JS day numbers: Sun=0 Mon=1 Tue=2 Wed=3 Thu=4 Fri=5 Sat=6
export const WEEK_STARTS_ON = 4; // Thursday

export function weekStart(date = new Date()) {
  const d = startOfDay(date);
  const diff = (d.getDay() - WEEK_STARTS_ON + 7) % 7;
  return addDays(d, -diff);
}

export function weekDays(date = new Date()) {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// Inclusive list of Date objects from start to end.
export function daysInRange(start, end) {
  const days = [];
  let d = startOfDay(start);
  const last = startOfDay(end);
  while (d <= last) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export function toISODate(d) {
  return format(d, 'yyyy-MM-dd');
}

export function fromISODate(s) {
  return parseISO(s);
}

export function dayLabel(d) {
  return format(d, 'EEE');           // "Thu"
}

export function dayLabelLong(d) {
  return format(d, 'EEEE, MMM d');   // "Thursday, May 14"
}

export function weekRangeLabel(d = new Date()) {
  const s = weekStart(d);
  const e = addDays(s, 6);
  return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`;
}

export function fmtMin(min) {
  if (!min) return '0m';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

export function fmtHours(min) {
  return (min / 60).toFixed(1) + 'h';
}

export function fmtTime(d) {
  // 7:30 AM
  return format(new Date(d), 'h:mm a');
}

export function fmtTime24(d) {
  return format(new Date(d), 'HH:mm');
}

// "07:30" string -> Date on the same calendar day as `dayDate`
export function combineDateAndTime(dayDate, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dayDate);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

// Bedtime "last night" -> a Date relative to the morning you woke (`dayDate`).
// PM hours (>= noon) are treated as the prior evening (day - 1); AM hours as the
// early hours of `dayDate` itself. e.g. for a wake day of May 21:
//   "23:00" -> May 20 23:00   "00:30" -> May 21 00:30
export function combineBedtime(dayDate, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(dayDate);
  if ((h || 0) >= 12) d.setDate(d.getDate() - 1);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

// Minutes between bedtime and wake. Returns null if either is missing or the
// result is non-positive (bad data).
export function sleepMinutes(sleepAt, wakeAt) {
  if (!sleepAt || !wakeAt) return null;
  const mins = Math.round((new Date(wakeAt) - new Date(sleepAt)) / 60000);
  return mins > 0 ? mins : null;
}

export function fmtElapsed(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export { addDays, isSameDay, fnsIsToday as isToday, differenceInCalendarDays, format };
