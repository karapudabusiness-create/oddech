import { useLiveQuery } from '@/hooks/useLiveQuery';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { ReorderableList } from '@/components/exercises/ReorderableList';
import { Button, Card, EmptyState, ErrorState, Screen, Text } from '@/components/ui';
import { db } from '@/db/client';
import {
  exercisesQuery,
  hasPacer,
  reorderExercises,
  updateExercise,
} from '@/db/repositories/exercises';
import type { Exercise } from '@/db/schema';
import { SLOT_ORDER } from '@/features/program/plan';
import { strings } from '@/i18n';
import { useHaptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

function ExerciseItem({ exercise }: { exercise: Exercise }) {
  const { colors, spacing } = useTheme();
  const haptics = useHaptics();
  const meta = [
    `${exercise.minutes} ${strings.common.minutesShort}`,
    hasPacer(exercise)
      ? strings.today.tempo(exercise.inhaleS, exercise.exhaleS)
      : strings.today.noPacer,
  ].join(' · ');
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingRight: spacing.xs,
      }}
    >
      <Pressable
        style={{ flex: 1, minHeight: 44, justifyContent: 'center', gap: 2 }}
        accessibilityRole="button"
        accessibilityLabel={`${strings.common.edit}: ${exercise.name}`}
        onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
      >
        <Text variant="bodyStrong" style={{ opacity: exercise.active ? 1 : 0.55 }}>
          {exercise.name}
        </Text>
        <Text variant="caption" color="textMuted">
          {meta}
          {exercise.active ? '' : ` · ${strings.exercises.inactive}`}
        </Text>
      </Pressable>
      <Switch
        value={exercise.active}
        onValueChange={(active) => {
          haptics.selection();
          void updateExercise(db, exercise.id, { active });
        }}
        accessibilityLabel={strings.exercises.toggleActive(exercise.name)}
        trackColor={{ true: colors.secondary, false: colors.border }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

export default function ExercisesScreen() {
  const { spacing, colors } = useTheme();
  const { data, error } = useLiveQuery(exercisesQuery(db));
  const [dragging, setDragging] = useState(false);
  const haptics = useHaptics();

  const groups = useMemo(
    () =>
      SLOT_ORDER.map((slot) => ({
        slot,
        items: data.filter((e) => e.slot === slot).map((e) => ({ ...e, label: e.name })),
      })),
    [data],
  );

  if (error) return <ErrorState error={error} />;

  const addButton = (
    <Button
      label={strings.common.add}
      size="sm"
      variant="soft"
      icon={<Plus color={colors.primaryText} size={18} />}
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: 'new' } })}
    />
  );

  return (
    <Screen title={strings.exercises.title} headerRight={addButton} scrollEnabled={!dragging}>
      {data.length === 0 ? (
        <Card>
          <EmptyState
            title={strings.exercises.empty}
            actionLabel={strings.exercises.add}
            onAction={() => router.push({ pathname: '/exercise/[id]', params: { id: 'new' } })}
          />
        </Card>
      ) : (
        <>
          <Text variant="caption" color="textMuted">
            {strings.exercises.reorderHint}
          </Text>
          {groups
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <Card
                key={g.slot}
                style={{ paddingHorizontal: spacing.xs, paddingVertical: spacing.sm }}
              >
                <Text
                  variant="label"
                  color="textMuted"
                  accessibilityRole="header"
                  style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs }}
                >
                  {strings.slots[g.slot]}
                </Text>
                <ReorderableList
                  items={g.items}
                  onDragStateChange={(d) => {
                    if (d) haptics.press();
                    setDragging(d);
                  }}
                  onReorder={(ids) => void reorderExercises(db, ids)}
                  renderItem={(e) => <ExerciseItem exercise={e} />}
                />
              </Card>
            ))}
        </>
      )}
    </Screen>
  );
}
