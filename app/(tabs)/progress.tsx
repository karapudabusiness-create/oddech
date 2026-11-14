import { EmptyState, Screen } from '@/components/ui';
import { strings } from '@/i18n';

export default function ProgressScreen() {
  return (
    <Screen title={strings.progress.title}>
      <EmptyState title={strings.progress.placeholder} />
    </Screen>
  );
}
