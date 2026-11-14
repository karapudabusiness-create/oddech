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

Wszystko działa bez internetu – dane są zapisywane na telefonie. Logowanie i synchronizacja z Supabase: w przygotowaniu.

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

## Import danych z prototypu

Ustawienia → Konto i dane → „Importuj z pliku JSON”. Obsługiwane formaty:

- kopia z tej aplikacji (`"app": "oddech"`) – scalanie wiersz po wierszu, przy konflikcie wygrywa nowsza zmiana,
- prototyp HTML: `{ exercises: [{ id, name, slot: "rano"|"dzien"|"wieczor"|"trening", minutes, inhale, exhale, desc, active }],
logs: { "YYYY-MM-DD": { done: [id], catches, tension, note } }, settings: { startDate, catchGoal } }`.
  Ćwiczenia są dopasowywane po nazwie lub kodzie „Ćn”, nowe są tworzone; nic lokalnego nie jest usuwane.

## Skrypty

| Polecenie                         | Opis                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm start`                       | serwer deweloperski Expo                                                                                                                            |
| `npm test`                        | testy jednostkowe (Jest) – logika dat, programu, serii, statystyk, pacera, przypomnień, importu/eksportu, repozytoriów (prawdziwy SQLite w pamięci) |
| `npm run typecheck`               | TypeScript                                                                                                                                          |
| `npm run lint`                    | ESLint + Prettier                                                                                                                                   |
| `npm run db:generate`             | nowa migracja SQLite po zmianie `db/schema.ts`                                                                                                      |
| `node scripts/generate-sounds.js` | ponowne wygenerowanie dźwięków pacera                                                                                                               |

## Struktura

```
app/          ekrany (Expo Router): (tabs)/, pacer/, day/, exercise/, settings/, onboarding
components/   UI: ui/ (design system), today/, pacer/, calendar/, charts/, exercises/, settings/
features/     logika domenowa: program, pacer, stats, calendar, reminders, data (import/eksport), today
db/           schemat Drizzle, migracje, repozytoria (jedyne miejsce zapisu), seed
theme/        design tokens: kolory (WCAG AA), typografia, odstępy, promienie, cienie
i18n/         teksty (pl.ts) – jedyne miejsce na napisy UI
lib/          daty, uuid, haptyka, kontrast kolorów
supabase/     migracje SQL i funkcje (etap logowania i synchronizacji)
```

Zasady dla kontrybutorów: `AGENTS.md`.
