import { router, Stack } from 'expo-router';
import { BellRing, Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { colors, spacing, radii } = useTheme();
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
