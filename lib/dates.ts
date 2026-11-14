/**
 * Pomocnicze funkcje dat. „Dzień” to zawsze data w lokalnej strefie użytkownika
 * w formacie 'YYYY-MM-DD' (DateKey). Tydzień zaczyna się w poniedziałek.
 */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

/** Parsuje DateKey jako lokalne południe (odporne na zmiany czasu letniego). */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Liczba dni kalendarzowych od `a` do `b` (b − a). */
export function diffDays(a: DateKey, b: DateKey): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** 1 = poniedziałek … 7 = niedziela */
export function isoWeekday(key: DateKey): number {
  const js = fromDateKey(key).getDay();
  return js === 0 ? 7 : js;
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, 1 - isoWeekday(key));
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

export function addMonths(key: DateKey, months: number): DateKey {
  const [y, m] = key.split('-').map(Number);
  const total = (y ?? 1970) * 12 + ((m ?? 1) - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-01`;
}

/** Zakres dni [from, to] włącznie. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

/**
 * Siatka miesiąca do kalendarza: pełne tygodnie od poniedziałku.
 * Dni spoza miesiąca mają wartość null.
 */
export function monthGrid(monthKey: DateKey): (DateKey | null)[][] {
  const first = startOfMonth(monthKey);
  const [y, m] = first.split('-').map(Number);
  const count = daysInMonth(y ?? 1970, m ?? 1);
  const lead = isoWeekday(first) - 1;
  const cells: (DateKey | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 0; i < count; i++) cells.push(addDays(first, i));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DateKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** 'HH:MM' → minuty od północy */
export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** Znacznik ISO (UTC) → lokalny DateKey. */
export function isoToDateKey(iso: string): DateKey {
  return toDateKey(new Date(iso));
}
