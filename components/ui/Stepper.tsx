import { Minus, Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

/** Wybór liczby przyciskami −/+. Dla czytników ekranu: rola „adjustable” (przesuń w górę/dół). */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const { colors, spacing } = useTheme();
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <View style={{ gap: 2 }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: format(value) }}
        accessibilityHint={hint}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? inc() : dec())}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.sm }}
      >
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {label}
        </Text>
        <IconButton
          tone="soft"
          accessibilityLabel={strings.pacer.decrease(label)}
          onPress={dec}
          disabled={value <= min}
          importantForAccessibility="no"
        >
          <Minus color={colors.primaryText} size={18} />
        </IconButton>
        <Text
          variant="subheading"
          align="center"
          style={{ minWidth: 64, fontVariant: ['tabular-nums'] }}
        >
          {format(value)}
        </Text>
        <IconButton
          tone="soft"
          accessibilityLabel={strings.pacer.increase(label)}
          onPress={inc}
          disabled={value >= max}
          importantForAccessibility="no"
        >
          <Plus color={colors.primaryText} size={18} />
        </IconButton>
      </View>
      {hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
