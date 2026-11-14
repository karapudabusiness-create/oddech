import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Divider,
  PickerRow,
  Section,
  Segmented,
  SwitchRow,
  WeekdayPicker,
} from '@/components/settings/controls';
import { Button, Card, LoadingState, Stepper, Text } from '@/components/ui';
import { db } from '@/db/client';
import { updateSettings } from '@/db/repositories/settings';
import type { ReminderSettings } from '@/db/schema';
import { programPhase, weekPlanFor } from '@/features/program/plan';
import {
  getPermission,
  sendTestReminder,
  type PermissionState,
} from '@/features/reminders/notifications';
import { breathCheckMinutes, MAX_BREATH_CHECKS, MIN_GAP_MIN } from '@/features/reminders/plan';
import { useSettings } from '@/features/settings/useSettings';
import { useToday } from '@/hooks/useToday';
import { strings } from '@/i18n';
import { formatTime, parseTime } from '@/lib/dates';
import { useToast } from '@/stores/toast';
import { useTheme } from '@/theme';

const t = strings.settings.reminders;

export default function RemindersSettingsScreen() {
  const settings = useSettings();
  const today = useToday();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const showToast = useToast((s) => s.show);
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    const check = () => void getPermission().then(setPermission);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  if (!settings) return <LoadingState />;
  const r = settings.reminders;
  const save = (next: ReminderSettings) => void updateSettings(db, { reminders: next });
  const bc = r.breathCheck;
  const setBc = (patch: Partial<ReminderSettings['breathCheck']>) =>
    save({ ...r, breathCheck: { ...bc, ...patch } });

  const toggleMaster = (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      router.push('/reminders-permission');
      return;
    }
    save({ ...r, enabled });
  };

  const span = parseTime(bc.windowEnd) - parseTime(bc.windowStart);
  const windowTooShort = span < bc.count * MIN_GAP_MIN;
  const preview = breathCheckMinutes(bc.count, bc.windowStart, bc.windowEnd, bc.mode, today)
    .map(formatTime)
    .join(', ');
  const plan = weekPlanFor(programPhase(settings.programStartDate, today));
  const off = !r.enabled;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.xl,
        paddingBottom: insets.bottom + spacing.huge,
      }}
    >
      <Stack.Screen options={{ headerShown: true, title: t.title }} />

      {permission === 'denied' ? (
        <Card tone="soft" style={{ gap: spacing.sm }}>
          <Text color="dangerText">{t.denied}</Text>
          <Button
            label={t.openSettings}
            size="sm"
            variant="soft"
            onPress={() => void Linking.openSettings()}
          />
        </Card>
      ) : null}

      <Section title={t.master} footer={t.masterHint}>
        <SwitchRow
          label={t.master}
          value={r.enabled && permission === 'granted'}
          onChange={toggleMaster}
        />
      </Section>

      <Section title={t.practiceSection}>
        <SwitchRow
          label={t.morning}
          value={r.morning.enabled}
          disabled={off}
          onChange={(enabled) => save({ ...r, morning: { ...r.morning, enabled } })}
        />
        <PickerRow
          label={t.time}
          mode="time"
          value={r.morning.time}
          disabled={off || !r.morning.enabled}
          onChange={(time) => save({ ...r, morning: { ...r.morning, time } })}
        />
        <Divider />
        <SwitchRow
          label={t.evening}
          value={r.evening.enabled}
          disabled={off}
          onChange={(enabled) => save({ ...r, evening: { ...r.evening, enabled } })}
        />
        <PickerRow
          label={t.time}
          mode="time"
          value={r.evening.time}
          disabled={off || !r.evening.enabled}
          onChange={(time) => save({ ...r, evening: { ...r.evening, time } })}
        />
      </Section>

      <Section
        title={t.breathSection}
        footer={
          bc.enabled && !off && bc.weekdays.length
            ? windowTooShort
              ? t.windowTooShort
              : t.preview(preview)
            : undefined
        }
      >
        <SwitchRow
          label={t.breathEnabled}
          value={bc.enabled}
          disabled={off}
          onChange={(enabled) => setBc({ enabled })}
        />
        {bc.enabled ? (
          <View style={{ opacity: off ? 0.45 : 1 }} pointerEvents={off ? 'none' : 'auto'}>
            <Stepper
              label={t.count}
              value={bc.count}
              min={1}
              max={MAX_BREATH_CHECKS}
              format={strings.settings.times}
              onChange={(count) => setBc({ count })}
              hint={plan ? t.planHint(plan.breathChecks) : undefined}
            />
            <PickerRow
              label={t.windowStart}
              mode="time"
              value={bc.windowStart}
              onChange={(windowStart) => setBc({ windowStart })}
            />
            <PickerRow
              label={t.windowEnd}
              mode="time"
              value={bc.windowEnd}
              onChange={(windowEnd) => setBc({ windowEnd })}
            />
            <Segmented
              accessibilityLabel={t.mode}
              options={[
                { value: 'random' as const, label: t.modeRandom },
                { value: 'even' as const, label: t.modeEven },
              ]}
              value={bc.mode}
              onChange={(mode) => setBc({ mode })}
            />
            <Text variant="caption" color="textMuted" style={{ paddingTop: spacing.xs }}>
              {t.weekdays}
            </Text>
            <WeekdayPicker value={bc.weekdays} onChange={(weekdays) => setBc({ weekdays })} />
            {bc.weekdays.length === 0 ? (
              <Text variant="caption" color="dangerText" style={{ paddingBottom: spacing.sm }}>
                {t.noDays}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Section>

      {r.enabled && permission === 'granted' ? (
        <Button
          label={t.test}
          variant="soft"
          fullWidth
          onPress={() => void sendTestReminder().then(() => showToast(t.testSent))}
        />
      ) : null}
    </ScrollView>
  );
}
