import { useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

/**
 * Wybór najbliższego punktu po dotknięciu / przesunięciu palcem.
 * Pionowy ruch oddajemy ScrollView (przewijanie ekranu działa normalnie).
 */
export function useChartTouch(count: number, plotLeft: number, plotWidth: number) {
  const [index, setIndex] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pick = (e: GestureResponderEvent) => {
    if (count === 0 || plotWidth <= 0) return;
    const x = e.nativeEvent.locationX - plotLeft;
    const slot = plotWidth / count;
    setIndex(Math.max(0, Math.min(count - 1, Math.floor(x / slot))));
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const release = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setIndex(null), 2500);
  };

  return {
    index,
    responder: {
      onStartShouldSetResponder: () => true,
      onResponderGrant: pick,
      onResponderMove: pick,
      onResponderRelease: release,
      onResponderTerminate: release,
      onResponderTerminationRequest: () => true,
    },
  };
}
