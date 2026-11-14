import { View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export function Chip({
  label,
  tone = 'soft',
}: {
  label: string;
  tone?: 'soft' | 'mint' | 'muted';
}) {
  const { colors, radii, spacing } = useTheme();
  const bg =
    tone === 'mint' ? colors.surfaceSoft : tone === 'muted' ? 'transparent' : colors.surfaceSoft;
  const fg =
    tone === 'mint'
      ? colors.secondaryText
      : tone === 'muted'
        ? colors.textMuted
        : colors.primaryText;
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radii.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderWidth: tone === 'muted' ? 1 : 0,
        borderColor: colors.border,
        alignSelf: 'flex-start',
      }}
    >
      <Text variant="caption" style={{ color: fg, fontFamily: 'NunitoSans_700Bold' }}>
        {label}
      </Text>
    </View>
  );
}
