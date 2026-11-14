import { useMemo } from 'react';

import { Screen } from '@/components/ui';
import { DayEditor } from '@/components/today/DayEditor';
import { db } from '@/db/client';
import { applyWeekChanges, diffWeekPlan, hasWeekChanges } from '@/features/program/applyWeek';
import { useDayData } from '@/features/today/useTodayData';
import { useToday } from '@/hooks/useToday';
import { strings } from '@/i18n';
import { fromDateKey } from '@/lib/dates';
import { useToast } from '@/stores/toast';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return strings.today.greetingMorning;
  if (h < 18) return strings.today.greetingDay;
  return strings.today.greetingEvening;
}

export default function TodayScreen() {
  const today = useToday();
  const { plan, exercises, settings } = useDayData(today, today);
  const showToast = useToast((s) => s.show);

  const changes = useMemo(
    () => (plan && settings ? diffWeekPlan(plan, exercises, settings.reminders) : null),
    [plan, exercises, settings],
  );

  const dateLabel = fromDateKey(today).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen title={greeting()} subtitle={dateLabel}>
      <DayEditor
        date={today}
        today={today}
        showBanner
        onApplyWeek={
          changes && settings && hasWeekChanges(changes)
            ? () =>
                void applyWeekChanges(db, changes, settings.reminders).then(() =>
                  showToast(strings.program.applied),
                )
            : undefined
        }
      />
    </Screen>
  );
}
