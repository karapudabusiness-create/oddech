import { Info, Play } from 'lucide-react-native';
import { View } from 'react-native';

import { Checkbox, Chip, IconButton, Text } from '@/components/ui';
import { hasPacer } from '@/db/repositories/exercises';
import type { Exercise } from '@/db/schema';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

export function ExerciseRow({
  exercise,
  done,
  recommended,
  onToggle,
  onInfo,
  onStart,
}: {
  exercise: Exercise;
  done: boolean;
  recommended?: boolean;
  onToggle: () => void;
  onInfo: () => void;
  onStart?: () => void;
}) {
  const { colors, spacing } = useTheme();
  const pacer = hasPacer(exercise);
  const meta = [
    `${exercise.minutes} ${strings.common.minutesShort}`,
    pacer ? strings.today.tempo(exercise.inhaleS, exercise.exhaleS) : strings.today.noPacer,
  ].join(' · ');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
      }}
    >
      <Checkbox
        checked={done}
        onToggle={onToggle}
        accessibilityLabel={
          done ? strings.today.markUndone(exercise.name) : strings.today.markDone(exercise.name)
        }
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          variant="bodyStrong"
          style={{ textDecorationLine: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}
        >
          {exercise.name}
        </Text>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}
        >
          <Text variant="caption" color="textMuted">
            {meta}
          </Text>
          {recommended ? <Chip label={strings.today.inPlan} tone="mint" /> : null}
        </View>
      </View>
      <IconButton
        accessibilityLabel={`${strings.common.description}: ${exercise.name}`}
        onPress={onInfo}
      >
        <Info color={colors.textMuted} size={22} />
      </IconButton>
      {pacer && onStart ? (
        <IconButton
          tone="primary"
          accessibilityLabel={`${strings.common.start}: ${exercise.name}`}
          onPress={onStart}
        >
          <Play color={colors.onPrimary} size={20} fill={colors.onPrimary} />
        </IconButton>
      ) : null}
    </View>
  );
}
