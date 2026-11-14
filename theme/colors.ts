/**
 * Paleta kolorów „Oddech”. Wartości bazowe pochodzą z briefu.
 * Tokeny *Text / on* zostały dobrane tak, by tekst spełniał WCAG AA (≥ 4.5:1)
 * na tle `background`, `surface` i `surfaceSoft` w danym motywie.
 */
export type ColorScheme = 'light' | 'dark';

export interface Palette {
  primary: string;
  /** Primary użyty jako kolor tekstu / ikon na jasnych tłach. */
  primaryText: string;
  /** Tekst na wypełnieniu `primary`. */
  onPrimary: string;
  secondary: string;
  secondaryText: string;
  /** Mocniejsza mięta – wypełnienia, na których leży biały tekst. */
  secondaryStrong: string;
  onSecondaryStrong: string;
  gradientStart: string;
  gradientEnd: string;
  background: string;
  surface: string;
  surfaceSoft: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  dangerText: string;
  /** Skala intensywności (kalendarz, wykresy): 0 → 100%. */
  scale: [string, string, string, string];
  overlay: string;
  shadow: string;
  /** Kolory wykresów – zwalidowane (pasmo jasności, chroma, kontrast ≥ 3:1 z surface). */
  chart: { blue: string; mint: string; grid: string };
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    // Brief: #2E7DAF – minimalnie przyciemnione, by biały tekst miał ≥ 4.5:1 (AA).
    primary: '#2C7AAB',
    primaryText: '#286F9C',
    onPrimary: '#FFFFFF',
    secondary: '#3BB08F',
    secondaryText: '#227A62',
    secondaryStrong: '#227A62',
    onSecondaryStrong: '#FFFFFF',
    gradientStart: '#4FA3D9',
    gradientEnd: '#5CC9A7',
    background: '#F3F8FA',
    surface: '#FFFFFF',
    surfaceSoft: '#E4F2F1',
    text: '#12303F',
    textMuted: '#557080',
    border: '#D9E7EC',
    danger: '#D9604C',
    dangerText: '#B84A38',
    scale: ['#E4F2F1', '#A8DCCB', '#3BB08F', '#2C7AAB'],
    overlay: 'rgba(18, 48, 63, 0.35)',
    shadow: '#12303F',
    chart: { blue: '#2C7AAB', mint: '#2E9A7B', grid: '#E3EEF2' },
  },
  dark: {
    primary: '#5DB2E3',
    primaryText: '#5DB2E3',
    onPrimary: '#0B1A22',
    secondary: '#5ED3AE',
    secondaryText: '#5ED3AE',
    secondaryStrong: '#5ED3AE',
    onSecondaryStrong: '#0B1A22',
    gradientStart: '#2F6F99',
    gradientEnd: '#2F9C80',
    background: '#0B1A22',
    surface: '#12262F',
    surfaceSoft: '#1A3540',
    text: '#E6F1F4',
    textMuted: '#93AEB8',
    border: '#24404B',
    danger: '#E98A76',
    dangerText: '#E98A76',
    scale: ['#1A3540', '#25615A', '#3FA587', '#5DB2E3'],
    overlay: 'rgba(0, 0, 0, 0.55)',
    shadow: '#000000',
    chart: { blue: '#3E9CD0', mint: '#3FAA86', grid: '#1E3842' },
  },
};
