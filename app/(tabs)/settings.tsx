import { View, Pressable } from 'react-native';

import { Card, Screen, Text } from '@/components/ui';
import { updateSettings } from '@/db/repositories/settings';
import { db } from '@/db/client';
import { useSettings } from '@/features/settings/useSettings';
import { strings } from '@/i18n';
import { useTheme, type ThemeMode } from '@/theme';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: strings.settings.themeSystem },
  { value: 'light', label: strings.settings.themeLight },
  { value: 'dark', label: strings.settings.themeDark },
];

export default function SettingsScreen() {
  const settings = useSettings();
  const { colors, spacing, radii } = useTheme();
  return (
    <Screen title={strings.settings.title}>
      <Card style={{ gap: spacing.md }}>
        <Text variant="label" color="textMuted">
          {strings.settings.theme}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup">
          {MODES.map((m) => {
            const selected = settings?.theme === m.value;
            return (
              <Pressable
                key={m.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => void updateSettings(db, { theme: m.value })}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: radii.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.primary : colors.surfaceSoft,
                }}
              >
                <Text
                  variant="bodyStrong"
                  style={{ color: selected ? colors.onPrimary : colors.text }}
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}
