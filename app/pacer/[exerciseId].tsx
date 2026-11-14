import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pause, Play, Square, Volume2, VolumeX, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BreathCircle } from '@/components/pacer/BreathCircle';
import { Button, Card, EmptyState, IconButton, LoadingState, Stepper, Text } from '@/components/ui';
import { db } from '@/db/client';
import { completeExercise, setCompletionFeeling } from '@/db/repositories/days';
import { exerciseByIdQuery, hasPacer } from '@/db/repositories/exercises';
import { updateSettings } from '@/db/repositories/settings';
import type { Exercise, Settings, SoundTheme } from '@/db/schema';
import {
  cycleMs,
  PACER_LIMITS,
  totalCycles,
  totalMs,
  type PacerConfig,
} from '@/features/pacer/engine';
import { SOUND_THEMES, usePacerSounds } from '@/features/pacer/sounds';
import { usePacerSession } from '@/features/pacer/usePacerSession';
import { useSettings } from '@/features/settings/useSettings';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { strings } from '@/i18n';
import { formatDuration, todayKey } from '@/lib/dates';
import { useTheme } from '@/theme';

/** Minimalny czas, by sesja zakończona ręcznie liczyła się jako wykonanie. */
const MIN_COUNTED_MS = 30_000;

export default function PacerRoute() {
  const { exerciseId, date } = useLocalSearchParams<{ exerciseId: string; date?: string }>();
  const { data, updatedAt } = useLiveQuery(exerciseByIdQuery(db, exerciseId), [exerciseId]);
  const settings = useSettings();
  const exercise = data[0];

  if (!settings || !updatedAt) return <LoadingState />;
  if (!exercise || !hasPacer(exercise)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <EmptyState
          title={exercise ? strings.pacer.noPacer : strings.pacer.notFound}
          actionLabel={strings.common.close}
          onAction={() => router.back()}
        />
      </View>
    );
  }
  return <PacerScreen exercise={exercise} settings={settings} date={date ?? todayKey()} />;
}

function PacerScreen({
  exercise,
  settings,
  date,
}: {
  exercise: Exercise;
  settings: Settings;
  date: string;
}) {
  const { colors, spacing, radii, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const [config, setConfig] = useState<PacerConfig>({
    inhaleS: exercise.inhaleS,
    exhaleS: exercise.exhaleS,
    restS: 0,
    durationS: Math.max(1, exercise.minutes) * 60,
  });
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [countedMs, setCountedMs] = useState(0);
  const [feeling, setFeeling] = useState<number | null>(null);

  const sound = settings.sound;
  const sounds = usePacerSounds({
    enabled: sound.enabled,
    theme: sound.theme,
    volume: sound.volume,
    playInSilentMode: sound.playInSilentMode,
  });

  const session = usePacerSession(config, { haptics: settings.haptics, onCue: sounds.play });

  const save = async (ms: number) => {
    setCountedMs(ms);
    if (ms < MIN_COUNTED_MS) return;
    const id = await completeExercise(db, exercise.id, date, {
      source: 'pacer',
      durationS: Math.round(ms / 1000),
    });
    setCompletionId(id);
  };

  // Naturalny koniec sesji → zapis (raz).
  const [savedNatural, setSavedNatural] = useState(false);
  if (session.status === 'finished' && !savedNatural && session.view.elapsedMs >= totalMs(config)) {
    setSavedNatural(true);
    void save(totalMs(config));
  }

  const finishEarly = () => {
    const ms = session.finish();
    sounds.play('end');
    void save(ms);
  };

  const close = () => {
    if (session.status === 'running' || session.status === 'paused') {
      session.pause();
      Alert.alert(strings.pacer.confirmExitTitle, strings.pacer.confirmExitBody, [
        { text: strings.pacer.confirmExitStay, style: 'cancel', onPress: session.resume },
        { text: strings.pacer.finish, onPress: finishEarly },
        {
          text: strings.pacer.confirmExitLeave,
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);
      return;
    }
    router.back();
  };

  const done = async () => {
    if (completionId && feeling !== null) await setCompletionFeeling(db, completionId, feeling);
    router.back();
  };

  const circleSize = Math.min(width - spacing.xxxl * 2, height * 0.42, 340);
  const total = totalMs(config);
  const fg = colors.text;

  const toggleSound = () =>
    void updateSettings(db, { sound: { ...sound, enabled: !sound.enabled } });

  const bgColors = useMemo(
    () =>
      (scheme === 'dark'
        ? [colors.background, '#0E2630', colors.surfaceSoft]
        : [colors.background, '#E8F4F6', colors.surfaceSoft]) as [string, string, string],
    [scheme, colors],
  );

  return (
    <LinearGradient colors={bgColors} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: session.status === 'setup' }} />
      {/* Pasek górny */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <IconButton accessibilityLabel={strings.pacer.close} onPress={close}>
          <X color={fg} size={24} />
        </IconButton>
        <Text variant="subheading" align="center" numberOfLines={2} style={{ flex: 1 }}>
          {exercise.name}
        </Text>
        <IconButton
          accessibilityLabel={strings.pacer.sound}
          accessibilityRole="switch"
          accessibilityState={{ checked: sound.enabled }}
          onPress={toggleSound}
        >
          {sound.enabled ? (
            <Volume2 color={fg} size={22} />
          ) : (
            <VolumeX color={colors.textMuted} size={22} />
          )}
        </IconButton>
      </View>

      {session.status === 'setup' ? (
        <SetupView
          config={config}
          setConfig={setConfig}
          settings={settings}
          onStart={session.start}
          bottomInset={insets.bottom}
        />
      ) : session.status === 'finished' ? (
        <SummaryView
          ms={countedMs || session.view.elapsedMs}
          breaths={Math.min(
            totalCycles(config),
            Math.floor((countedMs || session.view.elapsedMs) / cycleMs(config)),
          )}
          counted={countedMs >= MIN_COUNTED_MS}
          feeling={feeling}
          setFeeling={setFeeling}
          onDone={() => void done()}
          bottomInset={insets.bottom}
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: insets.bottom + spacing.xl,
          }}
        >
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl }}
          >
            <BreathCircle
              elapsed={session.elapsed}
              config={config}
              size={circleSize}
              reduceMotion={reduceMotion}
            />
            <View
              style={{ alignItems: 'center', gap: spacing.xs, minHeight: 110 }}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={
                session.status === 'paused'
                  ? strings.pacer.paused
                  : strings.pacer.a11yPhase(
                      strings.pacer.phase[session.view.phase],
                      session.view.countdown,
                    )
              }
            >
              <Text variant="display" style={{ fontSize: 40, lineHeight: 48 }}>
                {session.status === 'paused'
                  ? strings.pacer.paused
                  : `${strings.pacer.phase[session.view.phase]} ${session.view.countdown}`}
              </Text>
              <Text color="textMuted" align="center" style={{ paddingHorizontal: spacing.xxl }}>
                {session.status === 'paused' ? '' : strings.pacer.phaseHint[session.view.phase]}
              </Text>
            </View>
          </View>

          <View style={{ width: '100%', paddingHorizontal: spacing.xxl, gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text variant="caption" color="textMuted">
                  {strings.pacer.elapsed}
                </Text>
                <Text variant="heading" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatDuration(session.view.elapsedMs / 1000)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" color="textMuted">
                  {strings.pacer.remaining}
                </Text>
                <Text variant="heading" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatDuration((total - session.view.elapsedMs) / 1000)}
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xl,
              }}
            >
              <Pressable
                onPress={finishEarly}
                accessibilityRole="button"
                accessibilityLabel={strings.pacer.finish}
                style={({ pressed }) => ({
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Square color={colors.text} size={20} />
              </Pressable>
              <Pressable
                onPress={session.status === 'running' ? session.pause : session.resume}
                accessibilityRole="button"
                accessibilityLabel={
                  session.status === 'running' ? strings.pacer.pause : strings.pacer.resume
                }
                style={({ pressed }) => ({
                  width: 80,
                  height: 80,
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {session.status === 'running' ? (
                  <Pause color={colors.onPrimary} size={30} fill={colors.onPrimary} />
                ) : (
                  <Play color={colors.onPrimary} size={30} fill={colors.onPrimary} />
                )}
              </Pressable>
              <View style={{ width: 56 }} />
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

function SetupView({
  config,
  setConfig,
  settings,
  onStart,
  bottomInset,
}: {
  config: PacerConfig;
  setConfig: (c: PacerConfig) => void;
  settings: Settings;
  onStart: () => void;
  bottomInset: number;
}) {
  const { colors, spacing, radii } = useTheme();
  const sound = settings.sound;
  const setSound = (patch: Partial<typeof sound>) =>
    void updateSettings(db, { sound: { ...sound, ...patch } });
  const minutes = Math.round(config.durationS / 60);

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.lg,
        paddingBottom: bottomInset + spacing.xl,
      }}
    >
      <Card style={{ gap: spacing.xs }}>
        <Text variant="label" color="textMuted" accessibilityRole="header">
          {strings.pacer.setupTitle}
        </Text>
        <Stepper
          label={strings.pacer.inhale}
          value={config.inhaleS}
          min={PACER_LIMITS.inhale.min}
          max={PACER_LIMITS.inhale.max}
          format={strings.pacer.seconds}
          onChange={(inhaleS) => setConfig({ ...config, inhaleS })}
        />
        <Stepper
          label={strings.pacer.exhale}
          value={config.exhaleS}
          min={PACER_LIMITS.exhale.min}
          max={PACER_LIMITS.exhale.max}
          format={strings.pacer.seconds}
          onChange={(exhaleS) => setConfig({ ...config, exhaleS })}
        />
        <Stepper
          label={strings.pacer.rest}
          value={config.restS}
          min={PACER_LIMITS.rest.min}
          max={PACER_LIMITS.rest.max}
          format={strings.pacer.seconds}
          onChange={(restS) => setConfig({ ...config, restS })}
          hint={strings.pacer.restHint}
        />
        <Stepper
          label={strings.pacer.duration}
          value={minutes}
          min={PACER_LIMITS.minutes.min}
          max={PACER_LIMITS.minutes.max}
          format={strings.pacer.minutes}
          onChange={(m) => setConfig({ ...config, durationS: m * 60 })}
          hint={strings.pacer.breathsCount(totalCycles(config))}
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 44,
          }}
        >
          <Text variant="bodyStrong">{strings.pacer.sound}</Text>
          <Switch
            value={sound.enabled}
            onValueChange={(enabled) => setSound({ enabled })}
            accessibilityLabel={strings.pacer.sound}
            trackColor={{ true: colors.secondary, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
        {sound.enabled ? (
          <Animated.View entering={FadeIn} style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup">
              {SOUND_THEMES.map((t: SoundTheme) => {
                const selected = sound.theme === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setSound({ theme: t })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${strings.pacer.soundTheme}: ${strings.pacer.soundThemes[t]}`}
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
                      {strings.pacer.soundThemes[t]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 44,
              }}
            >
              <Text style={{ flex: 1 }}>{strings.pacer.silentMode}</Text>
              <Switch
                value={sound.playInSilentMode}
                onValueChange={(playInSilentMode) => setSound({ playInSilentMode })}
                accessibilityLabel={strings.pacer.silentMode}
                trackColor={{ true: colors.secondary, false: colors.border }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 44,
          }}
        >
          <Text variant="bodyStrong">{strings.pacer.haptics}</Text>
          <Switch
            value={settings.haptics}
            onValueChange={(haptics) => void updateSettings(db, { haptics })}
            accessibilityLabel={strings.pacer.haptics}
            trackColor={{ true: colors.secondary, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
      </Card>

      <Button label={strings.pacer.begin} fullWidth onPress={onStart} />
    </ScrollView>
  );
}

function SummaryView({
  ms,
  breaths,
  counted,
  feeling,
  setFeeling,
  onDone,
  bottomInset,
}: {
  ms: number;
  breaths: number;
  counted: boolean;
  feeling: number | null;
  setFeeling: (n: number) => void;
  onDone: () => void;
  bottomInset: number;
}) {
  const { colors, spacing, radii } = useTheme();
  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.lg,
        paddingBottom: bottomInset + spacing.xl,
      }}
    >
      <Animated.View entering={FadeIn.duration(400)} style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
          <Text variant="title" accessibilityRole="header" align="center">
            {strings.pacer.summaryTitle}
          </Text>
          <Text color="textMuted" align="center">
            {counted ? strings.pacer.summaryBody : strings.pacer.summaryTooShort}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" color="textMuted">
              {strings.pacer.summaryDuration}
            </Text>
            <Text variant="stat">{formatDuration(ms / 1000)}</Text>
          </Card>
          <Card style={{ flex: 1, alignItems: 'center' }}>
            <Text variant="caption" color="textMuted">
              {strings.pacer.summaryBreaths}
            </Text>
            <Text variant="stat">{breaths}</Text>
          </Card>
        </View>
        {counted ? (
          <Card style={{ gap: spacing.md }}>
            <Text variant="subheading">{strings.pacer.feelingQuestion}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }} accessibilityRole="radiogroup">
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = feeling === n;
                const label = strings.pacer.feelings[n - 1] ?? '';
                return (
                  <Pressable
                    key={n}
                    onPress={() => setFeeling(n)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={strings.pacer.feelingLabel(n, label)}
                    style={{
                      flex: 1,
                      minHeight: 56,
                      borderRadius: radii.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.secondaryStrong : colors.surfaceSoft,
                    }}
                  >
                    <Text
                      variant="heading"
                      style={{ color: selected ? colors.onSecondaryStrong : colors.text }}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" color="textMuted">
                {strings.pacer.feelings[0]}
              </Text>
              <Text variant="caption" color="textMuted">
                {strings.pacer.feelings[4]}
              </Text>
            </View>
          </Card>
        ) : null}
        <Button label={strings.pacer.done} fullWidth onPress={onDone} />
      </Animated.View>
    </ScrollView>
  );
}
