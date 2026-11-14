import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CalendarLegend, MonthGrid } from '@/components/calendar/MonthGrid';
import { Button, Card, ErrorState, IconButton, Screen, StatTile, Text } from '@/components/ui';
import { db } from '@/db/client';
import { completionsInRangeQuery, dayLogsInRangeQuery } from '@/db/repositories/days';
import { allExercisesQuery } from '@/db/repositories/exercisesAll';
import { buildMonth } from '@/features/calendar/month';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useToday } from '@/hooks/useToday';
import { strings } from '@/i18n';
import { addDays, addMonths, fromDateKey, startOfMonth } from '@/lib/dates';
import { useTheme } from '@/theme';

function monthLabel(monthKey: string): string {
  const s = fromDateKey(monthKey).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function CalendarScreen() {
  const today = useToday();
  const { colors, spacing } = useTheme();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const from = month;
  const to = addDays(addMonths(month, 1), -1);

  const exercisesQ = useLiveQuery(allExercisesQuery(db));
  const completionsQ = useLiveQuery(completionsInRangeQuery(db, from, to), [from, to]);
  const logsQ = useLiveQuery(dayLogsInRangeQuery(db, from, to), [from, to]);
  const error = exercisesQ.error ?? completionsQ.error ?? logsQ.error;

  const data = useMemo(
    () => buildMonth(month, today, exercisesQ.data, completionsQ.data, logsQ.data),
    [month, today, exercisesQ.data, completionsQ.data, logsQ.data],
  );

  if (error) return <ErrorState error={error} />;

  const isCurrent = month === startOfMonth(today);
  const isFutureMonth = month > startOfMonth(today);
  const { stats } = data;
  const empty = stats.trainingDays === 0 && stats.totalCatches === 0 && stats.avgTension === null;

  return (
    <Screen title={strings.calendar.title}>
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton
            accessibilityLabel={strings.calendar.prevMonth}
            onPress={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft color={colors.primaryText} size={24} />
          </IconButton>
          <Text
            variant="heading"
            align="center"
            style={{ flex: 1 }}
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
          >
            {monthLabel(month)}
          </Text>
          <IconButton
            accessibilityLabel={strings.calendar.nextMonth}
            onPress={() => setMonth(addMonths(month, 1))}
            disabled={isFutureMonth}
          >
            <ChevronRight color={colors.primaryText} size={24} />
          </IconButton>
        </View>
        <MonthGrid
          weeks={data.weeks}
          onPressDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })}
        />
        <CalendarLegend />
        {!isCurrent ? (
          <Button
            label={strings.calendar.backToToday}
            variant="soft"
            size="sm"
            onPress={() => setMonth(startOfMonth(today))}
            style={{ alignSelf: 'center' }}
          />
        ) : null}
      </Card>

      <Text variant="label" color="textMuted" accessibilityRole="header">
        {strings.calendar.statsTitle}
      </Text>
      {empty ? (
        <Card tone="soft">
          <Text color="textMuted">{strings.calendar.empty}</Text>
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatTile label={strings.calendar.stats.trainingDays} value={String(stats.trainingDays)} />
        <StatTile label={strings.calendar.stats.fullDays} value={String(stats.fullDays)} />
        <StatTile
          label={strings.calendar.stats.avgTension}
          value={
            stats.avgTension === null
              ? strings.calendar.noTension
              : stats.avgTension.toLocaleString('pl-PL')
          }
          suffix={stats.avgTension === null ? undefined : '/ 10'}
        />
        <StatTile label={strings.calendar.stats.catches} value={String(stats.totalCatches)} />
      </View>
    </Screen>
  );
}
