# Oddech – trener ćwiczeń oddechowych

Aplikacja mobilna (iOS + Android) do ćwiczeń oddechowych, śledzenia nawyków i postępów.
Expo + React Native + TypeScript, lokalna baza SQLite (offline-first), synchronizacja z Supabase.

> Pełna instrukcja (Supabase, EAS, wersje testowe) powstanie w etapie 8. Poniżej szybki start.

## Szybki start

```bash
npm install
npx expo start
```

Zeskanuj kod QR aplikacją **Expo Go** (Android) lub aparatem (iOS).

## Skrypty

| Polecenie | Opis |
|---|---|
| `npm start` | serwer deweloperski Expo |
| `npm test` | testy jednostkowe (Jest) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint + Prettier |
| `npm run db:generate` | nowa migracja SQLite po zmianie `db/schema.ts` |

## Struktura

```
app/          ekrany (Expo Router)
components/   komponenty UI (ui/, today/, exercises/…)
features/     logika domenowa (program, statystyki, dzień)
db/           schemat Drizzle, migracje, repozytoria, seed
sync/         synchronizacja z Supabase (etap 7)
theme/        design tokens: kolory, typografia, odstępy
i18n/         teksty (pl.ts)
lib/          narzędzia (daty, uuid, haptyka)
supabase/     migracje SQL i funkcje (etap 7)
```
