import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';

import { useSettings } from '@/features/settings/useSettings';

/** Haptyka z poszanowaniem ustawienia użytkownika. Błędy (np. brak wsparcia) są ignorowane. */
export function useHaptics() {
  const enabled = useSettings()?.haptics ?? true;
  return useMemo(
    () => ({
      tap: () =>
        enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
      press: () =>
        enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
      success: () =>
        enabled &&
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
      selection: () => enabled && void Haptics.selectionAsync().catch(() => {}),
    }),
    [enabled],
  );
}
