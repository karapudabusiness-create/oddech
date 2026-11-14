import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useMemo, useRef } from 'react';

import type { SoundTheme } from '@/db/schema';

type Cue = 'inhale' | 'exhale' | 'end';

const SOURCES: Record<SoundTheme, Record<Cue, number>> = {
  bell: {
    inhale: require('@/assets/sounds/bell-inhale.wav'),
    exhale: require('@/assets/sounds/bell-exhale.wav'),
    end: require('@/assets/sounds/bell-end.wav'),
  },
  breeze: {
    inhale: require('@/assets/sounds/breeze-inhale.wav'),
    exhale: require('@/assets/sounds/breeze-exhale.wav'),
    end: require('@/assets/sounds/breeze-end.wav'),
  },
  tone: {
    inhale: require('@/assets/sounds/tone-inhale.wav'),
    exhale: require('@/assets/sounds/tone-exhale.wav'),
    end: require('@/assets/sounds/tone-end.wav'),
  },
};

export const SOUND_THEMES: SoundTheme[] = ['bell', 'breeze', 'tone'];

/**
 * Sygnały zmiany fazy. Odtwarzacze są tworzone raz na motyw i odtwarzane od początku przy każdym sygnale.
 * Tryb audio: miksowanie z muzyką/podcastem (nie przerywamy treningu), opcjonalnie gra przy wyciszonym telefonie.
 */
export function usePacerSounds(opts: {
  enabled: boolean;
  theme: SoundTheme;
  volume: number;
  playInSilentMode: boolean;
}) {
  const players = useRef<Partial<Record<Cue, AudioPlayer>>>({});
  const { enabled, theme, volume, playInSilentMode } = opts;

  useEffect(() => {
    if (!enabled) return;
    setAudioModeAsync({
      playsInSilentMode: playInSilentMode,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).catch(() => undefined);
  }, [enabled, playInSilentMode]);

  useEffect(() => {
    if (!enabled) return;
    const created: Partial<Record<Cue, AudioPlayer>> = {};
    (Object.keys(SOURCES[theme]) as Cue[]).forEach((cue) => {
      try {
        created[cue] = createAudioPlayer(SOURCES[theme][cue]);
      } catch {
        // brak dźwięku nie może zatrzymać sesji
      }
    });
    players.current = created;
    return () => {
      Object.values(created).forEach((p) => p?.remove());
      players.current = {};
    };
  }, [enabled, theme]);

  return useMemo(
    () => ({
      play(cue: Cue) {
        if (!enabled) return;
        const p = players.current[cue];
        if (!p) return;
        try {
          p.volume = volume;
          void p
            .seekTo(0)
            .then(() => p.play())
            .catch(() => undefined);
        } catch {
          // ignorujemy błędy odtwarzania
        }
      },
    }),
    [enabled, volume],
  );
}
