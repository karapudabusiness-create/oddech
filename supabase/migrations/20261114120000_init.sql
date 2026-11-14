-- =====================================================================
-- Oddech – schemat bazy (Supabase / Postgres)
-- Uruchom raz: Supabase → SQL Editor → wklej całość → Run.
-- Skrypt jest idempotentny (można go uruchomić ponownie).
--
-- Model synchronizacji (offline-first):
--   * updated_at        – czas zmiany ustawiony przez urządzenie (LWW: nowszy wygrywa)
--   * server_updated_at – czas zapisu na serwerze (kursor pobierania zmian; odporny na złe zegary)
--   * deleted_at        – usunięcie miękkie (wiersze nigdy nie są kasowane przez aplikację)
-- Bezpieczeństwo: RLS – każdy użytkownik widzi i zmienia wyłącznie swoje wiersze.
-- =====================================================================

-- ---------- Tabele ----------

create table if not exists public.exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seed_key text,
  name text not null check (char_length(name) between 1 and 200),
  slot text not null check (slot in ('morning', 'day', 'evening', 'post_workout')),
  minutes integer not null default 1 check (minutes between 1 and 120),
  inhale_s integer not null default 0 check (inhale_s between 0 and 30),
  exhale_s integer not null default 0 check (exhale_s between 0 and 30),
  description text not null default '' check (char_length(description) <= 5000),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.day_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  catches integer not null default 0 check (catches between 0 and 10000),
  tension integer check (tension between 1 and 10),
  note text not null default '' check (char_length(note) <= 10000),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.catch_events (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.exercise_completions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null,
  date date not null,
  completed_at timestamptz not null default now(),
  duration_s integer not null default 0 check (duration_s between 0 and 86400),
  source text not null default 'manual' check (source in ('manual', 'pacer')),
  feeling integer check (feeling between 1 and 5),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  program_start_date date not null default current_date,
  catch_goal integer not null default 5 check (catch_goal between 1 and 100),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  sound jsonb not null default '{}'::jsonb,
  haptics boolean not null default true,
  reminders jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now()
);

-- ---------- Indeksy pod pobieranie zmian ----------

create index if not exists exercises_sync_idx on public.exercises (user_id, server_updated_at);
create index if not exists day_logs_sync_idx on public.day_logs (user_id, server_updated_at);
create index if not exists catch_events_sync_idx on public.catch_events (user_id, server_updated_at);
create index if not exists exercise_completions_sync_idx on public.exercise_completions (user_id, server_updated_at);

-- ---------- Trigger: last-write-wins + znacznik serwera ----------

create or replace function public.oddech_lww()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Starsza zmiana (np. z urządzenia, które długo było offline) nie nadpisuje nowszej.
    if new.updated_at < old.updated_at then
      return old;
    end if;
    -- Właściciela wiersza nie da się zmienić.
    new.user_id := old.user_id;
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['exercises', 'day_logs', 'catch_events', 'exercise_completions', 'settings'] loop
    execute format('drop trigger if exists oddech_lww on public.%I', t);
    execute format(
      'create trigger oddech_lww before insert or update on public.%I for each row execute function public.oddech_lww()',
      t
    );
  end loop;
end;
$$;

-- ---------- Row Level Security ----------

do $$
declare
  t text;
begin
  foreach t in array array['exercises', 'day_logs', 'catch_events', 'exercise_completions', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "own rows: select" on public.%I', t);
    execute format('drop policy if exists "own rows: insert" on public.%I', t);
    execute format('drop policy if exists "own rows: update" on public.%I', t);

    execute format(
      'create policy "own rows: select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy "own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t
    );
    execute format(
      'create policy "own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );

    -- Brak polityki DELETE: aplikacja usuwa miękko (deleted_at). Twarde usunięcie tylko razem z kontem.
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end;
$$;

-- ---------- Usunięcie konta (razem ze wszystkimi danymi – ON DELETE CASCADE) ----------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
