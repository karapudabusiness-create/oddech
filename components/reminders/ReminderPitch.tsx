import { BellRing, Check } from 'lucide-react-native';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

/** Wyjaśnienie, po co są przypomnienia – używane w onboardingu i na ekranie zgody. */
export function ReminderPitch() {
  const { colors, spacing, radii } = useTheme();
  const t = strings.reminders.permission;
  return (
    <View style={{ gap: spacing.xl }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceSoft,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
        }}
      >
        <BellRing color={colors.primaryText} size={34} />
      </View>
      <Text variant="title" align="center" accessibilityRole="header">
        {t.title}
      </Text>
      <Text color="textMuted" align="center">
        {t.body}
      </Text>
      <View style={{ gap: spacing.md }}>
        {t.points.map((p) => (
          <View key={p} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: colors.secondaryStrong,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              <Check color={colors.onSecondaryStrong} size={14} strokeWidth={3} />
            </View>
            <Text style={{ flex: 1 }}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
