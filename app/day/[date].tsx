import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DayEditor } from '@/components/today/DayEditor';
import { Card, EmptyState, Text } from '@/components/ui';
import { useToday } from '@/hooks/useToday';
import { strings } from '@/i18n';
import { fromDateKey, isDateKey } from '@/lib/dates';
import { useTheme } from '@/theme';

/** Edycja dowolnego dnia z przeszłości (uzupełnianie wstecz). */
export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const today = useToday();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const valid = isDateKey(date) && date <= today;

  const title = valid
    ? fromDateKey(date).toLocaleDateString('pl-PL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : strings.calendar.editDay;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        padding: spacing.xl,
        gap: spacing.lg,
        paddingBottom: insets.bottom + spacing.huge,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen
        options={{ headerShown: true, title: title.charAt(0).toUpperCase() + title.slice(1) }}
      />
      {valid ? (
        <>
          {date !== today ? (
            <Card tone="soft">
              <Text variant="caption" color="textMuted">
                {strings.calendar.backfillHint}
              </Text>
            </Card>
          ) : null}
          <DayEditor date={date} today={today} />
        </>
      ) : (
        <EmptyState title={strings.common.errorTitle} />
      )}
    </ScrollView>
  );
}
