import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Button, EmptyState, Screen } from '@/components/ui';
import { db } from '@/db/client';
import { completeExercise } from '@/db/repositories/days';
import { strings } from '@/i18n';
import { todayKey } from '@/lib/dates';

/** Tymczasowy ekran – pełny pacer powstaje w etapie 3. */
export default function PacerScreen() {
  const { exerciseId, date } = useLocalSearchParams<{ exerciseId: string; date?: string }>();
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <EmptyState title={strings.pacer.placeholder} />
      <Button
        label={strings.pacer.markDone}
        onPress={() =>
          void completeExercise(db, exerciseId, date ?? todayKey(), { source: 'pacer' }).then(() =>
            router.back(),
          )
        }
      />
    </Screen>
  );
}
