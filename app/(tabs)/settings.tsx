import { View, Pressable } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { seedDemoHistory } from '@/features/dev/demoData';
import { useToast } from '@/stores/toast';
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
  const showToast = useToast((st) => st.show);
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
      {__DEV__ ? (
        <Card tone="soft" style={{ gap: spacing.sm }}>
          <Text variant="label" color="textMuted">
            {strings.settings.devTitle}
          </Text>
          <Button
            label={strings.settings.devDemo}
            variant="soft"
            onPress={() =>
              void seedDemoHistory(db).then(() => showToast(strings.settings.devDemoDone))
            }
          />
        </Card>
      ) : null}
    </Screen>
  );
}
