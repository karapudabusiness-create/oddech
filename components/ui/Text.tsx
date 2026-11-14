import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme, type Palette, type TextVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof Palette | (string & {});
  align?: 'left' | 'center' | 'right';
}

/**
 * Tekst z tokenami typografii. Respektuje powiększoną czcionkę systemową
 * (maxFontSizeMultiplier ogranicza tylko duże liczby, żeby nie rozbijały układu).
 */
export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  const { colors, typography } = useTheme();
  const resolved = (colors as unknown as Record<string, string>)[color] ?? color;
  const isLarge = variant === 'stat' || variant === 'display';
  return (
    <RNText
      maxFontSizeMultiplier={isLarge ? 1.4 : 2}
      {...rest}
      style={[typography[variant], { color: resolved, textAlign: align }, style]}
    />
  );
}
