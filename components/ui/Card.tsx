import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

export interface CardProps extends ViewProps {
  tone?: 'surface' | 'soft';
  padded?: boolean;
}

export function Card({ tone = 'surface', padded = true, style, ...rest }: CardProps) {
  const { colors, radii, spacing, shadow } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: tone === 'soft' ? colors.surfaceSoft : colors.surface,
          borderRadius: radii.xl,
          padding: padded ? spacing.lg : 0,
          borderWidth: tone === 'surface' ? 1 : 0,
          borderColor: colors.border,
        },
        tone === 'surface' ? shadow : null,
        style,
      ]}
    />
  );
}
