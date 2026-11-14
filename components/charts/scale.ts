/** „Ładne” maksimum osi i krok siatki (1, 2, 5 × 10^n). */
export function niceScale(maxValue: number, ticks = 3): { max: number; step: number } {
  if (maxValue <= 0) return { max: ticks, step: 1 };
  const raw = maxValue / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  return { max: Math.ceil(maxValue / step) * step, step };
}

export function shortDate(key: string): string {
  return `${Number(key.slice(8, 10))}.${key.slice(5, 7)}`;
}

/** Indeksy etykiet osi X: początek, środek, koniec (bez dublowania). */
export function labelIndices(n: number): number[] {
  if (n <= 1) return [0];
  if (n <= 3) return Array.from({ length: n }, (_, i) => i);
  return [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
}
