import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReminderPitch } from '@/components/reminders/ReminderPitch';
import { Button, Text } from '@/components/ui';
import { db } from '@/db/client';
import { updateSettings } from '@/db/repositories/settings';
import {
  getPermission,
  requestPermission,
  type PermissionState,
} from '@/features/reminders/notifications';
import { useSettings } from '@/features/settings/useSettings';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

/** Uprzejma prośba o zgodę – przed systemowym dialogiem, z wyjaśnieniem po co. */
export default function RemindersPermissionScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const [state, setState] = useState<PermissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const t = strings.reminders.permission;

  useEffect(() => {
    void getPermission().then(setState);
  }, []);

  const allow = async () => {
    setBusy(true);
    try {
      const result = await requestPermission();
      setState(result);
      if (result === 'granted' && settings) {
        await updateSettings(db, { reminders: { ...settings.reminders, enabled: true } });
        router.back();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.xxl,
        paddingTop: spacing.huge,
        gap: spacing.xl,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
    >
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <ReminderPitch />

      {state === 'denied' ? (
        <View style={{ gap: spacing.md }}>
          <Text color="dangerText" align="center">
            {t.denied}
          </Text>
          <Button label={t.openSettings} fullWidth onPress={() => void Linking.openSettings()} />
        </View>
      ) : state === 'unsupported' ? (
        <Text color="textMuted" align="center">
          {t.unsupported}
        </Text>
      ) : (
        <Button label={t.allow} fullWidth loading={busy} onPress={() => void allow()} />
      )}
      <Button label={t.later} variant="ghost" fullWidth onPress={() => router.back()} />
    </ScrollView>
  );
}
