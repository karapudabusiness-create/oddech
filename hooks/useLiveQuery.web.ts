import { useEffect, useState } from 'react';

import { onLocalChange } from '@/db/changes';

/**
 * Wersja dla podglądu web: ponawia zapytanie po każdej zmianie zgłoszonej przez repozytoria.
 * API zgodne z `useLiveQuery` z drizzle-orm/expo-sqlite.
 */
export function useLiveQuery<T extends PromiseLike<unknown>>(query: T, deps: unknown[] = []) {
  const [state, setState] = useState<{
    data: Awaited<T>;
    error: Error | undefined;
    updatedAt: Date | undefined;
  }>({
    data: [] as unknown as Awaited<T>,
    error: undefined,
    updatedAt: undefined,
  });

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      Promise.resolve(query).then(
        (data) =>
          !cancelled &&
          setState({ data: data as Awaited<T>, error: undefined, updatedAt: new Date() }),
        (error: Error) => !cancelled && setState((s) => ({ ...s, error })),
      );
    };
    run();
    const unsubscribe = onLocalChange(run);
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
