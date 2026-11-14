import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import type { CalendarDay } from '@/features/calendar/month';
import { strings } from '@/i18n';
import { bestTextOn } from '@/lib/color';
import { fromDateKey } from '@/lib/dates';
import { useTheme } from '@/theme';

export function MonthGrid({
  weeks,
  onPressDay,
}: {
  weeks: (CalendarDay | null)[][];
  onPressDay: (date: string) => void;
}) {
  const { colors, spacing, radii } = useTheme();
  const textCandidates = [colors.text, colors.onPrimary, '#FFFFFF', '#0B1A22'];

  return (
    <View style={{ gap: spacing.xs }}>
      <View
        style={{ flexDirection: 'row' }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {strings.calendar.weekdays.map((d) => (
          <Text key={d} variant="caption" color="textMuted" align="center" style={{ flex: 1 }}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={{ flexDirection: 'row', gap: spacing.xs }}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={{ flex: 1, aspectRatio: 1 }} />;
            const bg = colors.scale[day.level];
            const fg = bestTextOn(bg, textCandidates);
            const label = fromDateKey(day.date).toLocaleDateString('pl-PL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            });
            return (
              <Pressable
                key={day.date}
                disabled={day.isFuture}
                onPress={() => onPressDay(day.date)}
                accessibilityRole="button"
                accessibilityState={{ disabled: day.isFuture, selected: day.isToday }}
                accessibilityLabel={
                  day.isFuture
                    ? `${label}, ${strings.calendar.future}`
                    : strings.calendar.dayA11y(label, day.done, day.total, day.hasEntry)
                }
                style={({ pressed }) => ({
                  flex: 1,
                  aspectRatio: 1,
                  minHeight: 40,
                  borderRadius: radii.md,
                  backgroundColor: day.isFuture ? 'transparent' : bg,
                  borderWidth: day.isToday ? 2 : day.isFuture ? 1 : 0,
                  borderColor: day.isToday ? colors.primaryText : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: day.isFuture ? 0.5 : pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                })}
              >
                <Text
                  variant="bodyStrong"
                  style={{
                    color: day.isFuture ? colors.textMuted : fg,
                    fontVariant: ['tabular-nums'],
                  }}
                  maxFontSizeMultiplier={1.3}
                >
                  {Number(day.date.slice(8))}
                </Text>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    marginTop: 2,
                    backgroundColor: day.hasEntry
                      ? day.isFuture
                        ? colors.textMuted
                        : fg
                      : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function CalendarLegend() {
  const { colors, spacing, radii } = useTheme();
  return (
    <View
      style={{ gap: spacing.sm }}
      accessible
      accessibilityLabel={`${strings.calendar.legend}: ${strings.calendar.legendLevels.join(', ')}`}
    >
      <Text variant="caption" color="textMuted">
        {strings.calendar.legend}
      </Text>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' }}
      >
        {colors.scale.map((c, i) => (
          <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: radii.sm / 2,
                backgroundColor: c,
                borderWidth: i === 0 ? 1 : 0,
                borderColor: colors.border,
              }}
            />
            <Text variant="caption" color="textMuted">
              {strings.calendar.legendLevels[i]}
            </Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted }}
          />
          <Text variant="caption" color="textMuted">
            {strings.calendar.legendEntry}
          </Text>
        </View>
      </View>
    </View>
  );
}
