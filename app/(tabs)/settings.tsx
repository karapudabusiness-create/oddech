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
import { wipeLocalData } from '@/db/repositories/maintenance';
import { exportCsv, exportJson, pickImportFile } from '@/features/data/fileActions';
import { ImportError } from '@/features/data/format';
import { importOddech, importPrototype } from '@/features/data/importData';
import { seedDemoHistory } from '@/features/dev/demoData';
import { SOUND_THEMES } from '@/features/pacer/sounds';
import { programPhase } from '@/features/program/plan';
import { useSettings } from '@/features/settings/useSettings';
import { useToday } from '@/hooks/useToday';
import { strings } from '@/i18n';
import { useAccount } from '@/stores/account';
import { useToast } from '@/stores/toast';
import { SyncBadge } from '@/components/account/SyncBadge';
import { useTheme, type ThemeMode } from '@/theme';

const t = strings.settings;

export default function SettingsScreen() {
  const settings = useSettings();
  const today = useToday();
  const { spacing } = useTheme();
  const showToast = useToast((st) => st.show);
  const session = useAccount((st) => st.session);

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

  const runExport = async (fn: (d: typeof db) => Promise<void>) => {
    try {
      await fn(db);
    } catch (e) {
      if (__DEV__) console.warn(e);
      showToast(t.exportError);
    }
  };

  const runImport = async () => {
    try {
      const detected = await pickImportFile();
      if (!detected) return;
      const days =
        detected.kind === 'oddech'
          ? new Set([
              ...detected.data.dayLogs.map((l) => l.date),
              ...detected.data.completions.map((c) => c.date),
            ]).size
          : Object.keys(detected.data.logs).length;
      Alert.alert(
        t.importConfirmTitle,
        detected.kind === 'oddech' ? t.importConfirmOddech(days) : t.importConfirmPrototype(days),
        [
          { text: strings.common.cancel, style: 'cancel' },
          {
            text: t.importConfirm,
            onPress: async () => {
              const summary =
                detected.kind === 'oddech'
                  ? await importOddech(db, detected.data)
                  : await importPrototype(db, detected.data);
              showToast(t.importDone(summary.days, summary.completions));
            },
          },
        ],
      );
    } catch (e) {
      showToast(e instanceof ImportError ? t.importErrors[e.code] : t.importErrors.other);
    }
  };

  const wipe = () =>
    Alert.alert(t.wipeConfirmTitle, t.wipeConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: t.wipeConfirm,
        style: 'destructive',
        onPress: () => void wipeLocalData(db).then(() => showToast(t.wiped)),
      },
    ]);

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
        <Row
          label={t.account}
          hint={session ? session.user.email : strings.account.rowSignedOut}
          right={session ? <SyncBadge compact /> : undefined}
          onPress={() => router.push('/account')}
        />
        <Divider />
        <Row
          label={t.exportJson}
          hint={t.exportJsonHint}
          onPress={() => void runExport(exportJson)}
        />
        <Divider />
        <Row label={t.exportCsv} hint={t.exportCsvHint} onPress={() => void runExport(exportCsv)} />
        <Divider />
        <Row label={t.importJson} hint={t.importJsonHint} onPress={() => void runImport()} />
        <Divider />
        <Row label={t.wipe} hint={t.wipeHint} danger onPress={wipe} />
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
