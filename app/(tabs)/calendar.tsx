import { EmptyState, Screen } from '@/components/ui';
import { strings } from '@/i18n';

export default function CalendarScreen() {
  return (
    <Screen title={strings.calendar.title}>
      <EmptyState title={strings.calendar.placeholder} />
    </Screen>
  );
}
