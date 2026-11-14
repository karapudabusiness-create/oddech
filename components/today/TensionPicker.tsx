import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function TensionPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const { colors, spacing, radii } = useTheme();
  return (
    <Card style={{ gap: spacing.md }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}
      >
        <Text variant="subheading">{strings.today.tension.title}</Text>
        {value !== null ? (
          <Pressable onPress={() => onChange(null)} accessibilityRole="button" hitSlop={12}>
            <Text variant="caption" color="primaryText">
              {strings.today.tension.clear}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
        accessibilityRole="radiogroup"
      >
        {LEVELS.map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(selected ? null : n)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={strings.today.tension.level(n)}
              style={({ pressed }) => ({
                flexBasis: '17%',
                flexGrow: 1,
                minHeight: 44,
                borderRadius: radii.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? colors.primary : colors.surfaceSoft,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                variant="bodyStrong"
                style={{ color: selected ? colors.onPrimary : colors.text }}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" color="textMuted">
        {strings.today.tension.hint}
      </Text>
    </Card>
  );
}
