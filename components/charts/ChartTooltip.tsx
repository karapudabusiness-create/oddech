import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

const WIDTH = 132;

/** Dymek nad wykresem; tekst w kolorach tekstu (nie serii), znacznik koloru obok. */
export function ChartTooltip({
  x,
  containerWidth,
  title,
  rows,
}: {
  x: number;
  containerWidth: number;
  title: string;
  rows: { label: string; value: string; swatch?: string }[];
}) {
  const { colors, radii, spacing, shadow } = useTheme();
  const left = Math.max(0, Math.min(containerWidth - WIDTH, x - WIDTH / 2));
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left,
          width: WIDTH,
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          zIndex: 5,
        },
        shadow,
      ]}
    >
      <Text variant="caption" color="textMuted">
        {title}
      </Text>
      {rows.map((r) => (
        <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {r.swatch ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.swatch }} />
          ) : null}
          <Text variant="caption" style={{ flex: 1 }}>
            {r.label}
          </Text>
          <Text variant="caption" style={{ fontFamily: 'NunitoSans_700Bold' }}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
