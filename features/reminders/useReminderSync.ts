import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/features/settings/useSettings';
import { todayKey } from '@/lib/dates';
import {
  configureNotifications,
  handleNotificationResponse,
  notificationsSupported,
  syncReminders,
} from './notifications';

/**
 * Montowane raz w głównym layoucie:
 *  - konfiguruje powiadomienia i obsługuje kliknięcia (także to, które uruchomiło aplikację),
 *  - przeplanowuje przypomnienia po zmianie ustawień, po powrocie do aplikacji i w nowym dniu.
 */
export function useReminderSync(): void {
  const settings = useSettings();
  const remindersKey = settings ? JSON.stringify(settings.reminders) : null;
  const lastSync = useRef<string>('');

  useEffect(() => {
    if (!notificationsSupported) return;
    void configureNotifications();
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      void handleNotificationResponse(last).then(() =>
        Notifications.clearLastNotificationResponse(),
      );
    }
    const sub = Notifications.addNotificationResponseReceivedListener(
      (r) => void handleNotificationResponse(r),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!notificationsSupported || !remindersKey) return;
    const run = (force: boolean) => {
      const key = `${remindersKey}|${todayKey()}`;
      if (!force && key === lastSync.current) return;
      lastSync.current = key;
      syncReminders(JSON.parse(remindersKey)).catch((e) => {
        lastSync.current = '';
        if (__DEV__) console.warn('Nie udało się zaplanować przypomnień', e);
      });
    };
    run(true);
    // Po powrocie z tła: nowe dni do zaplanowania, ew. zmieniona zgoda w ustawieniach systemu.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run(true));
    return () => sub.remove();
  }, [remindersKey]);
}
