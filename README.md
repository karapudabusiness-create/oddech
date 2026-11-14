# Oddech – trener ćwiczeń oddechowych

Aplikacja mobilna (iOS + Android) do ćwiczeń oddechowych, śledzenia nawyków i postępów.
Dla osób z płytkim oddechem, nawykiem wstrzymywania powietrza i napięciem w barkach i szczęce.

**Stack:** Expo SDK 58 · React Native · TypeScript (strict) · Expo Router · SQLite + Drizzle ORM (offline-first) ·
Zustand · Reanimated 4 · expo-notifications · expo-audio · expo-haptics · wykresy na react-native-svg.

## Funkcje

- **Dziś** – baner tygodnia programu (4 tygodnie + plan podtrzymujący), ćwiczenia wg pory dnia, postęp dnia,
  seria dni, licznik „Złapane wstrzymanie” (+1 / cofnij / cel), napięcie dnia 1–10, notatka z autozapisem.
- **Pacer** – animowane koło (60 fps, sinusoidalnie), odliczanie faz, pauza/wznów/zakończ, dźwięki (3 motywy),
  wibracje, ekran nie gaśnie, podsumowanie i ocena samopoczucia. Bez zachęcania do wstrzymywania oddechu.
- **Kalendarz** – intensywność wykonania dnia, uzupełnianie dni wstecz, statystyki miesiąca.
- **Postępy** – napięcie (średnia krocząca 7 dni), złapane wstrzymania, minuty tygodniowo, serie; 7/30/90 dni/program.
- **Ćwiczenia** – dodawanie, edycja, usuwanie z „Cofnij”, przeciąganie, włącz/wyłącz.
- **Przypomnienia** – rano/wieczór oraz „Oddychasz?” w oknie godzin i wybranych dniach; akcje w powiadomieniu.
- **Dane** – eksport JSON (kopia) i CSV (podsumowanie dni), import JSON (także z prototypu HTML), usunięcie danych.
- **Onboarding**, motyw jasny/ciemny/systemowy, dostępność (czytniki ekranu, duża czcionka, ograniczenie animacji).

- **Konto i synchronizacja** (opcjonalnie) – logowanie kodem z e-maila, dane z telefonu trafiają na konto,
  synchronizacja między urządzeniami (offline-first, „nowsza zmiana wygrywa”), wskaźnik stanu, usunięcie konta.

Wszystko działa bez internetu i bez konta – dane są zapisywane na telefonie.

## Szybki start (Expo Go)

Wymagania: Node.js 20+, telefon z aplikacją **Expo Go** (App Store / Google Play).

```bash
npm install
npm run go          # = npx expo start --go
```

Zeskanuj kod QR (iPhone: aparatem, Android: w Expo Go). Telefon i komputer muszą być w tej samej sieci
(w razie problemów: `npx expo start --go --tunnel`).

> Projekt zawiera `expo-dev-client`, dlatego samo `npx expo start` uruchamia tryb development builda.
> Dla Expo Go zawsze dodawaj `--go`.

W Expo Go działa prawie wszystko. Pełna obsługa powiadomień (akcje w powiadomieniu) wymaga development builda.

> **Dane testowe:** w trybie deweloperskim Ustawienia → „Wypełnij 45 dni przykładowymi danymi”.

## Development build (EAS)

Własna wersja aplikacji zamiast Expo Go – potrzebna do pełnych przypomnień i do wersji testowych.
Budowanie odbywa się w chmurze (bez Xcode / Android Studio).

```bash
npm install -g eas-cli
eas login
eas init            # tworzy projekt EAS i dopisuje projectId do app.json
```

**Android – plik APK (bez płatnego konta):**

```bash
eas build --profile development --platform android
```

Otwórz link z terminala na telefonie i zainstaluj APK. Potem:

```bash
npx expo start --dev-client
```

**iOS** wymaga płatnego konta Apple Developer (99 USD/rok):

```bash
eas device:create
eas build --profile development --platform ios
```

**Wersje testowe (do dzielenia się):** profil `preview` – Android: APK, iOS: dystrybucja ad hoc / TestFlight.

```bash
eas build --profile preview --platform android
```

Testowe przypomnienie: Ustawienia → Przypomnienia → włącz → „Wyślij próbne przypomnienie”.

## Konfiguracja Supabase (konto i synchronizacja)

Bez tej konfiguracji aplikacja działa w pełni lokalnie. Jednorazowo, ok. 10 minut:

1. **Projekt** – na [supabase.com](https://supabase.com) utwórz projekt (region: Europe / Frankfurt).
   Przy tworzeniu: _Enable Data API_ ✅, _Automatically expose new tables_ ⬜, _Enable automatic RLS_ ✅.
2. **Baza** – w panelu: **SQL Editor → New query**, wklej całą zawartość pliku
   `supabase/migrations/20261114120000_init.sql` i kliknij **Run**. Powinno pojawić się „Success. No rows returned”.
   (Skrypt można bezpiecznie uruchomić ponownie.)
3. **Kod w e-mailu** – **Authentication → Emails → Templates → Magic Link**. W treści wiadomości dopisz kod, np.:

   ```html
   <h2>Twój kod do aplikacji Oddech</h2>
   <p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
   <p>Albo otwórz na telefonie: <a href="{{ .ConfirmationURL }}">zaloguj się</a></p>
   ```

   Zrób to samo w szablonie **Confirm signup** (pierwsze logowanie nowego adresu).

4. **Adresy powrotu z linku** – **Authentication → URL Configuration → Redirect URLs**, dodaj:
   `oddech://auth/callback` oraz (dla Expo Go) `exp://**`.
5. **Klucze** – **Project Settings → API Keys**: skopiuj _Project URL_ i klucz _publishable_ (lub _anon public_).
   W katalogu projektu: `cp .env.example .env` i wklej wartości. Zrestartuj `npm run go`.
6. **Test** – Ustawienia → Konto i synchronizacja → wpisz e-mail → wpisz kod z wiadomości.

> **Limit e-maili:** wbudowana poczta Supabase wysyła tylko kilka wiadomości na godzinę – wystarczy do testów.
> Przed udostępnieniem aplikacji innym ustaw własny serwer SMTP (Authentication → Emails → SMTP Settings),
> np. Resend, Postmark lub SendGrid.

**Jak działa synchronizacja:** każda zmiana jest najpierw zapisywana na telefonie (`dirty = 1`).
Gdy jest internet, aplikacja pobiera zmiany z serwera (po `server_updated_at`), a potem wysyła swoje.
Konflikty: wygrywa zmiana z nowszym `updated_at` (pilnuje tego też trigger w bazie). Usunięcia są miękkie (`deleted_at`).
Złapane wstrzymania są zapisywane jako zdarzenia, więc +1 z dwóch telefonów offline się sumują.
Testy: `sync/engine.test.ts` (dwa urządzenia + serwer w pamięci) i `supabase/tests/migration.test.mjs`
(migracja na prawdziwym Postgresie – PGlite: RLS, LWW, usuwanie konta).

## Import danych z prototypu

Ustawienia → Konto i dane → „Importuj z pliku JSON”. Obsługiwane formaty:

- kopia z tej aplikacji (`"app": "oddech"`) – scalanie wiersz po wierszu, przy konflikcie wygrywa nowsza zmiana,
- prototyp HTML: `{ exercises: [{ id, name, slot: "rano"|"dzien"|"wieczor"|"trening", minutes, inhale, exhale, desc, active }],
logs: { "YYYY-MM-DD": { done: [id], catches, tension, note } }, settings: { startDate, catchGoal } }`.
  Ćwiczenia są dopasowywane po nazwie lub kodzie „Ćn”, nowe są tworzone; nic lokalnego nie jest usuwane.

## Skrypty

| Polecenie                         | Opis                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm start`                       | serwer deweloperski Expo                                                                                                                                                                                                 |
| `npm test`                        | wszystkie testy: Jest (logika dat, programu, serii, statystyk, pacera, przypomnień, importu/eksportu, repozytoriów prawdziwy SQLite w pamięci, synchronizacja dwóch urządzeń) + migracja Supabase na Postgresie (PGlite) |
| `npm run typecheck`               | TypeScript                                                                                                                                                                                                               |
| `npm run lint`                    | ESLint + Prettier                                                                                                                                                                                                        |
| `npm run db:generate`             | nowa migracja SQLite po zmianie `db/schema.ts`                                                                                                                                                                           |
| `node scripts/generate-sounds.js` | ponowne wygenerowanie dźwięków pacera                                                                                                                                                                                    |

## Struktura

```
app/          ekrany (Expo Router): (tabs)/, pacer/, day/, exercise/, settings/, onboarding
components/   UI: ui/ (design system), today/, pacer/, calendar/, charts/, exercises/, settings/
features/     logika domenowa: program, pacer, stats, calendar, reminders, data (import/eksport), today
db/           schemat Drizzle, migracje, repozytoria (jedyne miejsce zapisu), seed
theme/        design tokens: kolory (WCAG AA), typografia, odstępy, promienie, cienie
i18n/         teksty (pl.ts) – jedyne miejsce na napisy UI
lib/          daty, uuid, haptyka, kontrast kolorów
sync/         silnik synchronizacji (pobierz → wyślij, LWW), klient Supabase, harmonogram
supabase/     migracja SQL (tabele, RLS, trigger LWW, usuwanie konta) i jej testy
```

Zasady dla kontrybutorów: `AGENTS.md`.
