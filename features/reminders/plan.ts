import type { ReminderSettings } from '@/db/schema';
import { addDays, fromDateKey, isoWeekday, parseTime, type DateKey } from '@/lib/dates';

/** iOS przechowuje maksymalnie 64 zaplanowane powiadomienia – zostawiamy zapas. */
export const MAX_SCHEDULED = 60;
export const MAX_BREATH_CHECKS = 8;
/** Minimalny odstęp między przypomnieniami „Oddychasz?” (min). */
export const MIN_GAP_MIN = 20;

export interface PlannedBreathCheck {
  date: DateKey;
  /** minuty od północy */
  minute: number;
  /** stały identyfikator (to samo przypomnienie przy ponownym planowaniu) */
  id: string;
}

/** Deterministyczny generator: te same godziny dla danego dnia przy każdym przeplanowaniu. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * Godziny przypomnień w oknie [start, end).
 *  - even: środki równych przedziałów
 *  - random: losowo w każdym z N równych przedziałów (bez skupisk), z min. odstępem
 */
export function breathCheckMinutes(
  count: number,
  windowStart: string,
  windowEnd: string,
  mode: 'random' | 'even',
  seed: string,
): number[] {
  const start = parseTime(windowStart);
  const end = parseTime(windowEnd);
  const n = Math.max(0, Math.min(MAX_BREATH_CHECKS, Math.floor(count)));
  if (n === 0 || end <= start) return [];
  const span = end - start;
  const slot = span / n;
  if (mode === 'even')
    return Array.from({ length: n }, (_, i) => Math.round(start + slot * (i + 0.5)));

  const rnd = seeded(seed);
  const margin = Math.min(MIN_GAP_MIN / 2, slot / 4);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const lo = start + slot * i + margin;
    const hi = start + slot * (i + 1) - margin;
    out.push(Math.round(lo + rnd() * Math.max(0, hi - lo)));
  }
  return out;
}

/** Przypomnienia „Oddychasz?” na najbliższe dni (tylko przyszłe, wybrane dni tygodnia, w limicie). */
export function planBreathChecks(
  reminders: ReminderSettings,
  today: DateKey,
  now: Date,
  days = 7,
  /** ile miejsc zajmują inne powiadomienia */
  reserved = 2,
): PlannedBreathCheck[] {
  const bc = reminders.breathCheck;
  if (!reminders.enabled || !bc.enabled || bc.count <= 0 || bc.weekdays.length === 0) return [];
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const out: PlannedBreathCheck[] = [];
  for (let d = 0; d < days; d++) {
    const date = addDays(today, d);
    if (!bc.weekdays.includes(isoWeekday(date))) continue;
    const minutes = breathCheckMinutes(
      bc.count,
      bc.windowStart,
      bc.windowEnd,
      bc.mode,
      `${date}|${bc.count}|${bc.windowStart}|${bc.windowEnd}`,
    );
    minutes.forEach((minute, i) => {
      if (d === 0 && minute <= nowMinute) return;
      out.push({ date, minute, id: `breath-${date}-${i}` });
    });
  }
  return out.slice(0, MAX_SCHEDULED - reserved);
}

export function toDate(date: DateKey, minute: number): Date {
  const d = fromDateKey(date);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d;
}
