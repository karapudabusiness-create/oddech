import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { ChartCard, LegendItem } from '@/components/charts/ChartCard';
import { LineChart } from '@/components/charts/LineChart';
import { shortDate } from '@/components/charts/scale';
import { ErrorState, LoadingState, Screen, StatTile, Text } from '@/components/ui';
import { db } from '@/db/client';
import {
  activeDaysQuery,
  completionsInRangeQuery,
  dayLogsInRangeQuery,
} from '@/db/repositories/days';
import { allExercisesQuery } from '@/db/repositories/exercisesAll';
import { useSettings } from '@/features/settings/useSettings';
import { buildProgress, RANGES, rangeDates, type RangeKey } from '@/features/stats/progress';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useToday } from '@/hooks/useToday';
import { plural, strings } from '@/i18n';
import { addDays, startOfWeek } from '@/lib/dates';
import { useTheme } from '@/theme';

const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 1 });

function RangeSelector({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={strings.progress.rangeA11y}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceSoft,
        borderRadius: radii.pill,
        padding: 4,
        gap: spacing.xs,
      }}
    >
      {RANGES.map((r) => {
        const selected = r === value;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.surface : 'transparent',
            }}
          >
            <Text
              variant="bodyStrong"
              style={{ color: selected ? colors.primaryText : colors.textMuted, fontSize: 14 }}
            >
              {strings.progress.ranges[r]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProgressScreen() {
  const today = useToday();
  const settings = useSettings();
  const { colors, spacing } = useTheme();
  const [range, setRange] = useState<RangeKey>('30');
  const { from, to } = rangeDates(range, today, settings?.programStartDate ?? today);
  // Średnia krocząca potrzebuje 6 dni przed zakresem.
  const queryFrom = addDays(from, -6);

  const logsQ = useLiveQuery(dayLogsInRangeQuery(db, queryFrom, to), [queryFrom, to]);
  const completionsQ = useLiveQuery(completionsInRangeQuery(db, startOfWeek(from), to), [from, to]);
  const exercisesQ = useLiveQuery(allExercisesQuery(db));
  const activeQ = useLiveQuery(activeDaysQuery(db));
  const error = logsQ.error ?? completionsQ.error ?? exercisesQ.error ?? activeQ.error;

  const data = useMemo(
    () =>
      buildProgress({
        from,
        to,
        today,
        logs: logsQ.data,
        completions: completionsQ.data,
        exerciseMinutes: new Map(exercisesQ.data.map((e) => [e.id, e.minutes])),
        allActiveDays: activeQ.data.map((r) => r.date),
      }),
    [from, to, today, logsQ.data, completionsQ.data, exercisesQ.data, activeQ.data],
  );

  if (error) return <ErrorState error={error} />;
  if (!settings) return <LoadingState />;

  const { summary, streak } = data;
  const dayUnit = (n: number) => plural(n, strings.plural.day);

  // Złapane wstrzymania: dziennie do 45 dni, powyżej – sumy tygodniowe (czytelne słupki).
  const weeklyCatches = data.days.length > 45;
  const catchBars: BarDatum[] = weeklyCatches
    ? Object.entries(
        data.catches.reduce<Record<string, number>>((acc, p) => {
          const w = startOfWeek(p.date);
          acc[w] = (acc[w] ?? 0) + (p.value ?? 0);
          return acc;
        }, {}),
      ).map(([w, v]) => ({ key: w, label: shortDate(w), value: v }))
    : data.catches.map((p) => ({ key: p.date, label: shortDate(p.date), value: p.value ?? 0 }));
  const perDay = fmt(summary.totalCatches / Math.max(1, summary.trackedDays));

  const minuteBars: BarDatum[] = data.weeklyMinutes.map((w) => ({
    key: w.weekStart,
    label: shortDate(w.weekStart),
    value: w.minutes,
    muted: w.partial,
  }));
  const hasTension = data.tension.some((p) => p.value != null);
  const avgStr = summary.avgTension == null ? '–' : fmt(summary.avgTension);

  return (
    <Screen title={strings.progress.title}>
      <RangeSelector value={range} onChange={setRange} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatTile
          label={strings.progress.streakCurrent}
          value={String(streak.current)}
          suffix={dayUnit(streak.current)}
        />
        <StatTile
          label={strings.progress.streakLongest}
          value={String(streak.longest)}
          suffix={dayUnit(streak.longest)}
        />
      </View>

      <ChartCard
        title={strings.progress.tension.title}
        subtitle={
          hasTension ? strings.progress.tension.subtitle(avgStr, summary.tensionChange) : undefined
        }
        empty={hasTension ? undefined : strings.progress.tension.empty}
        legend={
          hasTension ? (
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <LegendItem
                kind="line"
                color={colors.chart.blue}
                label={strings.progress.tension.avg}
              />
              <LegendItem
                kind="dot"
                color={colors.chart.blue}
                label={strings.progress.tension.daily}
              />
            </View>
          ) : undefined
        }
        tableHeader={[strings.progress.table.day, strings.progress.table.tension]}
        table={data.days
          .map((d, i) => ({
            label: shortDate(d),
            value: `${data.tension[i]?.value ?? '–'}  (${data.tensionAvg7[i]?.value != null ? fmt(data.tensionAvg7[i]!.value!) : '–'})`,
          }))
          .reverse()}
      >
        <LineChart
          raw={data.tension}
          avg={data.tensionAvg7}
          color={colors.chart.blue}
          yMin={1}
          yMax={10}
          ticks={[2, 4, 6, 8, 10]}
          rawLabel={strings.progress.tension.daily}
          avgLabel={strings.progress.tension.avg}
          accessibilityLabel={strings.progress.tension.a11y(avgStr, summary.tensionChange)}
        />
      </ChartCard>

      <ChartCard
        title={
          weeklyCatches ? strings.progress.catches.titleWeekly : strings.progress.catches.title
        }
        subtitle={
          summary.totalCatches
            ? strings.progress.catches.subtitle(summary.totalCatches, perDay)
            : undefined
        }
        empty={summary.totalCatches ? undefined : strings.progress.catches.empty}
        legend={
          !weeklyCatches && summary.totalCatches ? (
            <LegendItem
              kind="dash"
              color={colors.textMuted}
              label={`${strings.progress.catches.goal}: ${settings.catchGoal}`}
            />
          ) : undefined
        }
        tableHeader={[
          weeklyCatches ? strings.progress.table.week : strings.progress.table.day,
          strings.progress.catches.label,
        ]}
        table={catchBars.map((b) => ({ label: b.label, value: String(b.value) })).reverse()}
      >
        <BarChart
          data={catchBars}
          color={colors.chart.mint}
          formatValue={String}
          tooltipLabel={strings.progress.catches.label}
          goal={weeklyCatches ? undefined : settings.catchGoal}
          accessibilityLabel={strings.progress.catches.a11y(summary.totalCatches, perDay)}
        />
      </ChartCard>

      <ChartCard
        title={strings.progress.minutes.title}
        subtitle={
          summary.totalMinutes ? strings.progress.minutes.subtitle(summary.totalMinutes) : undefined
        }
        empty={summary.totalMinutes ? undefined : strings.progress.minutes.empty}
        tableHeader={[strings.progress.table.week, strings.progress.minutes.label]}
        table={data.weeklyMinutes
          .map((w) => ({
            label:
              strings.progress.minutes.weekOf(shortDate(w.weekStart)) +
              (w.partial ? strings.progress.minutes.partial : ''),
            value: strings.progress.minutesUnit(w.minutes),
          }))
          .reverse()}
      >
        <BarChart
          data={minuteBars}
          color={colors.chart.blue}
          formatValue={strings.progress.minutesUnit}
          tooltipLabel={strings.progress.minutes.label}
          accessibilityLabel={strings.progress.minutes.a11y(
            summary.totalMinutes,
            minuteBars.length,
          )}
        />
      </ChartCard>

      <Text variant="caption" color="textMuted" align="center">
        {strings.progress.encouragement}
      </Text>
    </Screen>
  );
}
