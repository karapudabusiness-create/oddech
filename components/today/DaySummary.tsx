import { Flame } from 'lucide-react-native';
import { View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components/ui';
import type { DayProgress } from '@/features/stats/dayProgress';
import { plural, strings } from '@/i18n';
import { useTheme } from '@/theme';

export function DaySummary({ progress, streak }: { progress: DayProgress; streak?: number }) {
  const { colors, spacing } = useTheme();
  const pct = Math.round(progress.ratio * 100);
  const label = strings.today.dayProgress(progress.done, progress.total);
  return (
    <Card style={{ gap: spacing.md }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}
      >
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="heading" color="primaryText" style={{ fontVariant: ['tabular-nums'] }}>
          {pct}%
        </Text>
      </View>
      <ProgressBar value={progress.ratio} label={label} />
      {streak !== undefined ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {streak > 0 ? <Flame color={colors.danger} size={18} /> : null}
          <Text color="textMuted">
            {streak > 0
              ? strings.today.streak(streak, plural(streak, strings.plural.day)).replace('🔥 ', '')
              : strings.today.streakZero}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
