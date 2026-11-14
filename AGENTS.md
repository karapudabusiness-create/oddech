# Oddech – notatki dla agentów i deweloperów

- Expo SDK 58, Expo Router, TypeScript strict. Ekrany w `app/` (katalog główny, nie `src/app`).
- Instalacja pakietów: `npx expo install <pakiet>` (w środowisku bez dostępu do api.expo.dev: `EXPO_OFFLINE=1 npx expo install …`).
- Przed commitem: `npm run typecheck && npm run lint && npm test`.
- Dane: lokalny SQLite (Drizzle). Każdy zapis przez `db/repositories/*` (ustawia `updated_at`, `dirty`, woła `notifyLocalChange`).
  Nie pisz do tabel bezpośrednio z ekranów.
- Reaktywne odczyty: `useLiveQuery` z `@/hooks/useLiveQuery` (nie bezpośrednio z drizzle – wersja web jest podmieniona).
- Animacje Reanimated 4: używaj `sv.get()` / `sv.set()` zamiast `sv.value` (zgodność z React Compiler).
- Gesture Handler 3: nowe API hooków (`usePanGesture`, `GestureDetector`). Unikaj bibliotek opartych na starym API.
- Teksty UI wyłącznie w `i18n/pl.ts`. Kolory/odstępy wyłącznie z `theme/`.
- Pliki `*.web.ts` służą tylko do podglądu w przeglądarce (zrzuty ekranu), nie są celem produkcyjnym.
