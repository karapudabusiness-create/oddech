import { EmptyState, Screen } from '@/components/ui';
import { strings } from '@/i18n';

export default function TodayScreen() {
  return (
    <Screen title={strings.tabs.today}>
      <EmptyState title="…" />
    </Screen>
  );
}
