import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { strings } from '@/i18n';
import { phaseAt, totalMs, type BreathPhase, type PacerConfig } from './engine';

export type SessionStatus = 'setup' | 'running' | 'paused' | 'finished';

const KEEP_AWAKE_TAG = 'oddech-pacer';
const TICK_MS = 80;

export interface SessionView {
  phase: BreathPhase;
  countdown: number;
  cycle: number;
  elapsedMs: number;
}

/**
 * Sesja pacera. Czas sesji liczony z zegara ściennego (z uwzględnieniem pauz); wątek UI co klatkę
 * przelicza go na rozmiar koła (useFrameCallback → płynna animacja),
 * wątek JS co ~80 ms czyta go, aktualizuje napisy i wyzwala dźwięk/haptykę przy zmianie fazy.
 */
export function usePacerSession(
  config: PacerConfig,
  opts: { haptics: boolean; onCue: (cue: 'inhale' | 'exhale' | 'end') => void },
) {
  const elapsed = useSharedValue(0);
  const running = useSharedValue(false);
  /** Zegar ścienny: czas zgromadzony przed ostatnim wznowieniem + moment wznowienia. */
  const accumulated = useSharedValue(0);
  const resumedAt = useSharedValue(0);
  const [status, setStatus] = useState<SessionStatus>('setup');
  const [view, setView] = useState<SessionView>({
    phase: 'inhale',
    countdown: config.inhaleS,
    cycle: 0,
    elapsedMs: 0,
  });
  const lastPhase = useRef<string>('');
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  // Co klatkę: czas sesji z zegara ściennego (odporne na zgubione klatki i spowolnienia).
  useFrameCallback(() => {
    'worklet';
    if (running.get()) elapsed.set(accumulated.get() + (Date.now() - resumedAt.get()));
  }, true);

  const now = useCallback(
    () => (running.get() ? accumulated.get() + (Date.now() - resumedAt.get()) : accumulated.get()),
    [running, accumulated, resumedAt],
  );

  const cue = useCallback((phase: BreathPhase | 'end') => {
    const { haptics, onCue } = optsRef.current;
    if (phase === 'rest') return;
    onCue(phase);
    if (haptics) {
      const style =
        phase === 'inhale'
          ? Haptics.ImpactFeedbackStyle.Light
          : phase === 'exhale'
            ? Haptics.ImpactFeedbackStyle.Soft
            : Haptics.ImpactFeedbackStyle.Medium;
      void Haptics.impactAsync(style).catch(() => undefined);
    }
  }, []);

  // Pętla JS: napisy, sygnały, koniec sesji.
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      const ms = now();
      const s = phaseAt(ms, config);
      if (s.finished) {
        running.set(false);
        setView((v) => ({ ...v, elapsedMs: totalMs(config) }));
        setStatus('finished');
        cue('end');
        return;
      }
      const key = `${s.cycle}:${s.phase}`;
      if (key !== lastPhase.current) {
        lastPhase.current = key;
        cue(s.phase);
        AccessibilityInfo.announceForAccessibility(strings.pacer.phase[s.phase]);
      }
      setView({ phase: s.phase, countdown: s.countdown, cycle: s.cycle, elapsedMs: ms });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status, config, running, cue, now]);

  // Ekran nie gaśnie w trakcie sesji.
  useEffect(() => {
    if (status === 'running' || status === 'paused') {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
      return () => void deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);
    }
  }, [status]);

  // Aplikacja w tle → pauza (bez dźwięku w tle, bez gubienia czasu).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' && running.get()) {
        accumulated.set(accumulated.get() + (Date.now() - resumedAt.get()));
        running.set(false);
        setStatus('paused');
      }
    });
    return () => sub.remove();
  }, [running, accumulated, resumedAt]);

  const start = useCallback(() => {
    elapsed.set(0);
    accumulated.set(0);
    resumedAt.set(Date.now());
    lastPhase.current = '';
    running.set(true);
    setStatus('running');
  }, [elapsed, accumulated, resumedAt, running]);

  const pause = useCallback(() => {
    if (!running.get()) return;
    const ms = now();
    accumulated.set(ms);
    elapsed.set(ms);
    running.set(false);
    setStatus('paused');
  }, [running, accumulated, elapsed, now]);

  const resume = useCallback(() => {
    resumedAt.set(Date.now());
    running.set(true);
    setStatus('running');
  }, [running, resumedAt]);

  /** Zakończenie ręczne – zwraca faktyczny czas w ms. */
  const finish = useCallback(() => {
    const ms = now();
    accumulated.set(ms);
    running.set(false);
    setView((v) => ({ ...v, elapsedMs: ms }));
    setStatus('finished');
    return ms;
  }, [running, accumulated, now]);

  return { status, view, elapsed, start, pause, resume, finish };
}
