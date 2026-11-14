import type { ViewStyle } from 'react-native';
import type { Palette } from './colors';

/** Miękki cień kart. W ciemnym motywie cień jest praktycznie niewidoczny – karty wyróżnia kolor. */
export function cardShadow(colors: Palette, scheme: 'light' | 'dark'): ViewStyle {
  if (scheme === 'dark') return {};
  return {
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };
}
