import { EmptyState, Screen } from '@/components/ui';
import { strings } from '@/i18n';

export default function ExercisesScreen() {
  return (
    <Screen title={strings.exercises.title}>
      <EmptyState title="…" />
    </Screen>
  );
}
