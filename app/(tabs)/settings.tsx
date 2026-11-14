import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import {
  Divider,
  PickerRow,
  Row,
  Section,
  Segmented,
  SwitchRow,
} from '@/components/settings/controls';
import { Button, Card, LoadingState, Screen, Stepper, Text } from '@/components/ui';
import { db } from '@/db/client';
import { updateSettings } from '@/db/repositories/settings';
import type { SoundTheme } from '@/db/schema';
import { seedDemoHistory } from '@/features/dev/demoData';
import { SOUND_THEMES } from '@/features/pacer/sounds';
import { programPhase } from '@/features/program/plan';
import { useSettings } from '@/features/settings/useSettings';
import { useToday } from '@/hooks/useToday';
import { strings } from '@/i18n';
import { useToast } from '@/stores/toast';
import { useTheme, type ThemeMode } from '@/theme';

const t = strings.settings;

export default function SettingsScreen() {
  const settings = useSettings();
  const today = useToday();
  const { spacing } = useTheme();
  const showToast = useToast((st) => st.show);

  if (!settings) return <LoadingState />;
  const sound = settings.sound;
  const setSound = (patch: Partial<typeof sound>) =>
    void updateSettings(db, { sound: { ...sound, ...patch } });

  const phase = programPhase(settings.programStartDate, today);
  const phaseLabel =
    phase.kind === 'week'
      ? t.phaseWeek(phase.week)
      : phase.kind === 'maintenance'
        ? t.phaseMaintenance
        : t.phaseNotStarted;

  const restart = () =>
    Alert.alert(t.restartConfirmTitle, t.restartConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: t.restartConfirm,
        onPress: () =>
          void updateSettings(db, { programStartDate: today }).then(() => showToast(t.restarted)),
      },
    ]);

  return (
    <Screen title={t.title} contentContainerStyle={{ gap: spacing.xl }}>
      <Section title={t.sections.program} footer={t.programPhase(phaseLabel)}>
        <PickerRow
          label={t.programStart}
          mode="date"
          value={settings.programStartDate}
          maximumDate={today}
          onChange={(programStartDate) => void updateSettings(db, { programStartDate })}
        />
        <Divider />
        <Row label={t.restartProgram} hint={t.restartHint} onPress={restart} />
      </Section>

      <Section title={t.sections.counter} footer={t.catchGoalHint}>
        <Stepper
          label={t.catchGoal}
          value={settings.catchGoal}
          min={1}
          max={30}
          format={t.times}
          onChange={(catchGoal) => void updateSettings(db, { catchGoal })}
        />
      </Section>

      <Section title={t.sections.reminders}>
        <Row
          label={t.remindersRow}
          value={settings.reminders.enabled ? t.on : t.off}
          onPress={() => router.push('/settings/reminders')}
        />
      </Section>

      <Section title={t.sections.sound}>
        <SwitchRow
          label={t.sound}
          value={sound.enabled}
          onChange={(enabled) => setSound({ enabled })}
        />
        {sound.enabled ? (
          <>
            <Segmented
              accessibilityLabel={t.soundTheme}
              options={SOUND_THEMES.map((v: SoundTheme) => ({
                value: v,
                label: strings.pacer.soundThemes[v],
              }))}
              value={sound.theme}
              onChange={(theme) => setSound({ theme })}
            />
            <SwitchRow
              label={t.silentMode}
              hint={t.silentModeHint}
              value={sound.playInSilentMode}
              onChange={(playInSilentMode) => setSound({ playInSilentMode })}
            />
          </>
        ) : null}
        <Divider />
        <SwitchRow
          label={t.haptics}
          hint={t.hapticsHint}
          value={settings.haptics}
          onChange={(haptics) => void updateSettings(db, { haptics })}
        />
      </Section>

      <Section title={t.sections.appearance}>
        <Segmented<ThemeMode>
          accessibilityLabel={t.theme}
          options={[
            { value: 'system', label: t.themeSystem },
            { value: 'light', label: t.themeLight },
            { value: 'dark', label: t.themeDark },
          ]}
          value={settings.theme}
          onChange={(theme) => void updateSettings(db, { theme })}
        />
      </Section>

      <Section title={t.sections.account}>
        <Row label={t.account} hint={t.accountHint} disabled />
      </Section>

      {__DEV__ ? (
        <Card tone="soft" style={{ gap: spacing.sm }}>
          <Text variant="label" color="textMuted">
            {t.devTitle}
          </Text>
          <Button
            label={t.devDemo}
            variant="soft"
            onPress={() => void seedDemoHistory(db).then(() => showToast(t.devDemoDone))}
          />
        </Card>
      ) : null}

      <View style={{ alignItems: 'center' }}>
        <Text variant="caption" color="textMuted">
          {t.version(Constants.expoConfig?.version ?? '')}
        </Text>
      </View>
    </Screen>
  );
}
