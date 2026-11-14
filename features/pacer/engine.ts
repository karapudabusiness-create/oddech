/**
 * Czysta logika pacera: jaka faza oddechu trwa w danej milisekundzie sesji.
 * Funkcje są workletami – liczą się zarówno na wątku JS (tekst, dźwięk), jak i na wątku UI (animacja 60 fps).
 *
 * Świadomie NIE ma pauzy po wdechu (wstrzymania oddechu). Jedyna opcjonalna pauza to
 * naturalny odpoczynek po wydechu, domyślnie 0.
 */
export type BreathPhase = 'inhale' | 'exhale' | 'rest';

export interface PacerConfig {
  inhaleS: number;
  exhaleS: number;
  /** Naturalna pauza po wydechu (s), domyślnie 0. */
  restS: number;
  /** Docelowy czas sesji (s). Sesja kończy się zawsze po pełnym wydechu. */
  durationS: number;
}

export interface PhaseState {
  phase: BreathPhase;
  /** 0–1 w obrębie bieżącej fazy */
  phaseProgress: number;
  /** Odliczanie w dół w pełnych sekundach (4, 3, 2, 1) */
  countdown: number;
  /** Numer oddechu od 0 */
  cycle: number;
  /** 0 = najmniejsze koło, 1 = największe */
  level: number;
  finished: boolean;
}

export const PACER_LIMITS = {
  inhale: { min: 2, max: 10 },
  exhale: { min: 2, max: 14 },
  rest: { min: 0, max: 6 },
  minutes: { min: 1, max: 30 },
} as const;

export function cycleMs(cfg: PacerConfig): number {
  'worklet';
  return (cfg.inhaleS + cfg.exhaleS + cfg.restS) * 1000;
}

/** Liczba pełnych oddechów najbliższa docelowemu czasowi (min. 1). */
export function totalCycles(cfg: PacerConfig): number {
  'worklet';
  const c = cycleMs(cfg);
  if (c <= 0) return 0;
  return Math.max(1, Math.round((cfg.durationS * 1000) / c));
}

export function totalMs(cfg: PacerConfig): number {
  'worklet';
  return totalCycles(cfg) * cycleMs(cfg);
}

/** Łagodne sinusoidalne wygładzenie 0→1 (ease-in-out-sine). */
export function easeSine(x: number): number {
  'worklet';
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

export function phaseAt(elapsedMs: number, cfg: PacerConfig): PhaseState {
  'worklet';
  const c = cycleMs(cfg);
  const total = totalMs(cfg);
  if (c <= 0)
    return { phase: 'rest', phaseProgress: 0, countdown: 0, cycle: 0, level: 0, finished: true };
  if (elapsedMs >= total) {
    return {
      phase: 'rest',
      phaseProgress: 1,
      countdown: 0,
      cycle: totalCycles(cfg),
      level: 0,
      finished: true,
    };
  }
  const t = Math.max(0, elapsedMs);
  const cycle = Math.floor(t / c);
  const inCycle = t - cycle * c;
  const inhaleMs = cfg.inhaleS * 1000;
  const exhaleMs = cfg.exhaleS * 1000;

  let phase: BreathPhase;
  let phaseElapsed: number;
  let phaseLen: number;
  if (inCycle < inhaleMs) {
    phase = 'inhale';
    phaseElapsed = inCycle;
    phaseLen = inhaleMs;
  } else if (inCycle < inhaleMs + exhaleMs) {
    phase = 'exhale';
    phaseElapsed = inCycle - inhaleMs;
    phaseLen = exhaleMs;
  } else {
    phase = 'rest';
    phaseElapsed = inCycle - inhaleMs - exhaleMs;
    phaseLen = cfg.restS * 1000;
  }
  const phaseProgress = phaseLen > 0 ? phaseElapsed / phaseLen : 1;
  const countdown = Math.max(1, Math.ceil((phaseLen - phaseElapsed) / 1000));
  const level =
    phase === 'inhale'
      ? easeSine(phaseProgress)
      : phase === 'exhale'
        ? 1 - easeSine(phaseProgress)
        : 0;
  return { phase, phaseProgress, countdown, cycle, level, finished: false };
}

export function clampConfig(cfg: PacerConfig): PacerConfig {
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(v)));
  return {
    inhaleS: clamp(cfg.inhaleS, PACER_LIMITS.inhale.min, PACER_LIMITS.inhale.max),
    exhaleS: clamp(cfg.exhaleS, PACER_LIMITS.exhale.min, PACER_LIMITS.exhale.max),
    restS: clamp(cfg.restS, PACER_LIMITS.rest.min, PACER_LIMITS.rest.max),
    durationS: clamp(cfg.durationS / 60, PACER_LIMITS.minutes.min, PACER_LIMITS.minutes.max) * 60,
  };
}
