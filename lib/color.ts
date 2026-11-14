/** Względna luminancja wg WCAG 2.x dla koloru '#RRGGBB'. */
export function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Wybiera z kandydatów kolor tekstu o najwyższym kontraście z tłem. */
export function bestTextOn(background: string, candidates: string[]): string {
  return candidates.reduce((best, c) =>
    contrastRatio(c, background) > contrastRatio(best, background) ? c : best,
  );
}
