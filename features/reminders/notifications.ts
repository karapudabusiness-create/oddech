import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { addCatch, completeExercise } from '@/db/repositories/days';
import { exercisesQuery } from '@/db/repositories/exercises';
import type { ReminderSettings, Slot } from '@/db/schema';
import { strings } from '@/i18n';
import { parseTime, todayKey } from '@/lib/dates';
import { useToast } from '@/stores/toast';
import { planBreathChecks, toDate } from './plan';

const CHANNEL_ID = 'reminders';
const CATEGORY_BREATH = 'breath-check';
const CATEGORY_PRACTICE = 'practice';
export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

let configured = false;

/** Jednorazowa konfiguracja: wyświetlanie w trakcie działania aplikacji, kanał Androida, akcje. */
export async function configureNotifications(): Promise<void> {
  if (!notificationsSupported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: strings.reminders.channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 120],
    });
  }
  // Akcje otwierają aplikację – wtedy na pewno zapiszemy zmianę (niezawodnie także po zamknięciu aplikacji).
  await Notifications.setNotificationCategoryAsync(CATEGORY_BREATH, [
    {
      identifier: 'catch',
      buttonTitle: strings.reminders.actionCatch,
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'ok',
      buttonTitle: strings.reminders.actionOk,
      options: { opensAppToForeground: false },
    },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY_PRACTICE, [
    {
      identifier: 'done',
      buttonTitle: strings.reminders.actionDone,
      options: { opensAppToForeground: true },
    },
  ]);
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  await configureNotifications();
  const p = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

function dailyTrigger(time: string): Notifications.NotificationTriggerInput {
  const m = parseTime(time);
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: Math.floor(m / 60),
    minute: m % 60,
    channelId: CHANNEL_ID,
  };
}

/**
 * Przeplanowuje wszystkie przypomnienia od zera (idempotentne).
 * Rano/wieczór – powtarzalne codziennie; „Oddychasz?” – konkretne godziny na najbliższe dni.
 */
export async function syncReminders(reminders: ReminderSettings): Promise<number> {
  if (!notificationsSupported) return 0;
  await configureNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!reminders.enabled || (await getPermission()) !== 'granted') return 0;

  let count = 0;
  const practice = [
    {
      slot: 'morning' as const,
      cfg: reminders.morning,
      title: strings.reminders.morningTitle,
      body: strings.reminders.morningBody,
    },
    {
      slot: 'evening' as const,
      cfg: reminders.evening,
      title: strings.reminders.eveningTitle,
      body: strings.reminders.eveningBody,
    },
  ];
  for (const p of practice) {
    if (!p.cfg.enabled) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `practice-${p.slot}`,
      content: {
        title: p.title,
        body: p.body,
        categoryIdentifier: CATEGORY_PRACTICE,
        data: { kind: 'practice', slot: p.slot },
      },
      trigger: dailyTrigger(p.cfg.time),
    });
    count++;
  }

  const bodies = strings.reminders.breathBodies;
  const plan = planBreathChecks(reminders, todayKey(), new Date(), 7, count);
  for (const [i, b] of plan.entries()) {
    await Notifications.scheduleNotificationAsync({
      identifier: b.id,
      content: {
        title: strings.reminders.breathTitle,
        body: bodies[i % bodies.length] ?? '',
        categoryIdentifier: CATEGORY_BREATH,
        data: { kind: 'breath' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: toDate(b.date, b.minute),
        channelId: CHANNEL_ID,
      },
    });
    count++;
  }
  return count;
}

const handled = new Set<string>();

/** Obsługa dotknięcia powiadomienia lub przycisku akcji. */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
  const key = `${response.notification.request.identifier}|${response.notification.date}|${response.actionIdentifier}`;
  if (handled.has(key)) return;
  handled.add(key);

  const data = response.notification.request.content.data as
    { kind?: string; slot?: Slot } | undefined;
  const today = todayKey();
  const toast = useToast.getState().show;

  switch (response.actionIdentifier) {
    case 'catch':
      await addCatch(db, today);
      toast(strings.reminders.toastCatch);
      break;
    case 'done': {
      const slot = data?.slot;
      if (!slot) break;
      const list = (await exercisesQuery(db)).filter((e) => e.active && e.slot === slot);
      for (const e of list) await completeExercise(db, e.id, today);
      toast(strings.reminders.toastDone(strings.slots[slot]));
      break;
    }
    case 'ok':
      break;
    default:
      break;
  }
  if (response.actionIdentifier !== 'ok') router.navigate('/');
}

/** Próbne przypomnienie za kilka sekund (do sprawdzenia, czy wszystko działa). */
export async function sendTestReminder(): Promise<void> {
  if (!notificationsSupported) return;
  await configureNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: strings.reminders.breathTitle,
      body: strings.reminders.breathBodies[0] ?? '',
      categoryIdentifier: CATEGORY_BREATH,
      data: { kind: 'breath' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}
