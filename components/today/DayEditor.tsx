import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, LoadingState, Sheet, Text } from '@/components/ui';
import { db } from '@/db/client';
import {
  addCatch,
  completeExercise,
  setNote,
  setTension,
  uncompleteExercise,
  undoCatch,
} from '@/db/repositories/days';
import { hasPacer } from '@/db/repositories/exercises';
import type { Exercise } from '@/db/schema';
import { useDayData } from '@/features/today/useTodayData';
import { strings } from '@/i18n';
import type { DateKey } from '@/lib/dates';
import { useHaptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { CatchCounter } from './CatchCounter';
import { DaySummary } from './DaySummary';
import { ExerciseRow } from './ExerciseRow';
import { NoteEditor } from './NoteEditor';
import { ProgramBanner } from './ProgramBanner';
import { TensionPicker } from './TensionPicker';

/**
 * Pełna edycja jednego dnia: ćwiczenia, licznik, napięcie, notatka.
 * Używana na ekranie „Dziś” i przy uzupełnianiu dni wstecz z kalendarza.
 */
export function DayEditor({
  date,
  today,
  showBanner,
  onApplyWeek,
}: {
  date: DateKey;
  today: DateKey;
  showBanner?: boolean;
  onApplyWeek?: () => void;
}) {
  const { spacing } = useTheme();
  const haptics = useHaptics();
  const data = useDayData(date, today);
  const [info, setInfo] = useState<Exercise | null>(null);
  const isToday = date === today;

  const toggle = useCallback(
    (e: Exercise, done: boolean) => {
      haptics.tap();
      void (done ? uncompleteExercise(db, e.id, date) : completeExercise(db, e.id, date));
    },
    [date, haptics],
  );

  const start = (e: Exercise) =>
    router.push({ pathname: '/pacer/[exerciseId]', params: { exerciseId: e.id, date } });

  if (data.error) return <ErrorState error={data.error} />;
  if (data.loading || !data.settings) return <LoadingState />;

  return (
    <View style={{ gap: spacing.lg }}>
      {showBanner && data.phase ? (
        <ProgramBanner phase={data.phase} onApplyWeek={onApplyWeek} />
      ) : null}

      <DaySummary progress={data.progress} streak={isToday ? data.streak.current : undefined} />

      {data.groups.length === 0 ? (
        <Card>
          <EmptyState
            title={strings.today.noExercises}
            actionLabel={strings.today.noExercisesCta}
            onAction={() => router.navigate('/exercises')}
          />
        </Card>
      ) : (
        data.groups.map((g) => (
          <Card key={g.slot} style={{ paddingVertical: spacing.sm }}>
            <Text
              variant="label"
              color="textMuted"
              accessibilityRole="header"
              style={{ paddingTop: spacing.sm }}
            >
              {strings.slots[g.slot]}
            </Text>
            {g.items.map((e) => {
              const done = data.completedIds.has(e.id);
              return (
                <ExerciseRow
                  key={e.id}
                  exercise={e}
                  done={done}
                  recommended={!!e.seedKey && data.recommendedKeys.has(e.seedKey)}
                  onToggle={() => toggle(e, done)}
                  onInfo={() => setInfo(e)}
                  onStart={() => start(e)}
                />
              );
            })}
          </Card>
        ))
      )}

      <CatchCounter
        count={data.dayLog?.catches ?? 0}
        goal={data.settings.catchGoal}
        onAdd={() => {
          haptics.press();
          void addCatch(db, date);
        }}
        onUndo={() => {
          haptics.tap();
          void undoCatch(db, date);
        }}
      />

      <TensionPicker
        value={data.dayLog?.tension ?? null}
        onChange={(v) => {
          haptics.selection();
          void setTension(db, date, v);
        }}
      />

      <NoteEditor
        dateKey={date}
        value={data.dayLog?.note ?? ''}
        onSave={(note) => setNote(db, date, note)}
      />

      <Sheet
        visible={!!info}
        onClose={() => setInfo(null)}
        title={info?.name}
        footer={
          info && hasPacer(info) ? (
            <Button
              label={strings.common.start}
              fullWidth
              onPress={() => {
                const e = info;
                setInfo(null);
                start(e);
              }}
            />
          ) : null
        }
      >
        {info ? (
          <>
            <Text color="textMuted">
              {strings.slots[info.slot]} · {info.minutes} {strings.common.minutesShort}
              {hasPacer(info) ? ` · ${strings.today.tempo(info.inhaleS, info.exhaleS)}` : ''}
            </Text>
            <Text>{info.description}</Text>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
