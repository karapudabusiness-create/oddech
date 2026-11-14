import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type ColorScheme, type Palette } from './colors';
import { cardShadow } from './shadows';
import { radii, spacing } from './spacing';
import { typography } from './typography';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  shadow: ReturnType<typeof cardShadow>;
}

function buildTheme(scheme: ColorScheme): Theme {
  const colors = palettes[scheme];
  return { scheme, colors, spacing, radii, typography, shadow: cardShadow(colors, scheme) };
}

const ThemeContext = createContext<Theme>(buildTheme('light'));

export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const system = useColorScheme();
  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const theme = useMemo(() => buildTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
