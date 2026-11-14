import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { useFrameCallback, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BreathCircle } from '@/components/pacer/BreathCircle';
import { ReminderPitch } from '@/components/reminders/ReminderPitch';
import { Button, Card, Text } from '@/components/ui';
import { db } from '@/db/client';
import { updateSettings } from '@/db/repositories/settings';
import { totalMs, type PacerConfig } from '@/features/pacer/engine';
import { requestPermission } from '@/features/reminders/notifications';
import { useSettings } from '@/features/settings/useSettings';
import { strings } from '@/i18n';
import { todayKey } from '@/lib/dates';
import { useTheme } from '@/theme';

const PAGES = 3;
const DEMO: PacerConfig = { inhaleS: 4, exhaleS: 6, restS: 0, durationS: 3600 };

function BreathDemo({ size }: { size: number }) {
  const elapsed = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const total = totalMs(DEMO);
  useFrameCallback((info) => {
    'worklet';
    elapsed.set((elapsed.get() + (info.timeSincePreviousFrame ?? 0)) % total);
  }, true);
  return <BreathCircle elapsed={elapsed} config={DEMO} size={size} reduceMotion={reduceMotion} />;
}

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const settings = useSettings();
  const scroll = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const t = strings.onboarding;

  // Na wypadek zmiany szerokości (obrót, tablet) – wróć na bieżącą stronę.
  useEffect(() => {
    scroll.current?.scrollTo({ x: page * width, animated: false });
  }, [width, page]);

  const goTo = (p: number) => {
    setPage(p);
    scroll.current?.scrollTo({ x: p * width, animated: true });
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const finish = async (withReminders: boolean) => {
    if (!settings) return;
    setBusy(true);
    try {
      let reminders = settings.reminders;
      if (withReminders && (await requestPermission()) === 'granted')
        reminders = { ...reminders, enabled: true };
      await updateSettings(db, { onboardingDone: true, programStartDate: todayKey(), reminders });
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  const pageStyle = { width, paddingHorizontal: spacing.xxl, paddingTop: spacing.lg };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          minHeight: 48,
        }}
      >
        <Text variant="caption" color="textMuted">
          {t.step(page + 1, PAGES)}
        </Text>
        {page < PAGES - 1 ? (
          <Pressable
            onPress={() => goTo(PAGES - 1)}
            accessibilityRole="button"
            hitSlop={12}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text variant="bodyStrong" color="primaryText">
              {t.skip}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={pageStyle}
          contentContainerStyle={{
            gap: spacing.lg,
            alignItems: 'center',
            paddingBottom: spacing.xl,
          }}
        >
          <BreathDemo size={Math.min(width * 0.6, height * 0.3, 260)} />
          <Text variant="title" align="center" accessibilityRole="header">
            {t.breath.title}
          </Text>
          <Text align="center">{t.breath.body}</Text>
          <Text color="textMuted" align="center">
            {t.breath.body2}
          </Text>
          <Card tone="soft" style={{ alignSelf: 'stretch' }}>
            <Text variant="bodyStrong" align="center" color="secondaryText">
              {t.breath.tryIt}
            </Text>
          </Card>
        </ScrollView>

        <ScrollView
          style={pageStyle}
          contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xl }}
        >
          <Text variant="title" align="center" accessibilityRole="header">
            {t.plan.title}
          </Text>
          <Text color="textMuted" align="center">
            {t.plan.body}
          </Text>
          {strings.program.weeks.map((w, i) => (
            <Card
              key={w.goal}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surfaceSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="heading" color="primaryText">
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{w.goal}</Text>
                <Text variant="caption" color="textMuted">
                  {w.tips[0]}
                </Text>
              </View>
            </Card>
          ))}
          <Text variant="caption" color="textMuted" align="center">
            {t.plan.startsToday}
          </Text>
        </ScrollView>

        <ScrollView style={pageStyle} contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <ReminderPitch />
        </ScrollView>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.xxl,
          paddingBottom: insets.bottom + spacing.lg,
          gap: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.sm,
          }}
          importantForAccessibility="no-hide-descendants"
        >
          {Array.from({ length: PAGES }, (_, i) => (
            <View
              key={i}
              style={{
                width: i === page ? 22 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === page ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
        {page < PAGES - 1 ? (
          <Button label={t.next} fullWidth onPress={() => goTo(page + 1)} />
        ) : (
          <>
            <Button
              label={strings.reminders.permission.allow}
              fullWidth
              loading={busy}
              onPress={() => void finish(true)}
            />
            <Button
              label={t.later}
              variant="ghost"
              fullWidth
              disabled={busy}
              onPress={() => void finish(false)}
            />
          </>
        )}
      </View>
    </View>
  );
}
