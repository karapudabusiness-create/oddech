/**
 * Uruchamianie: node --test supabase/tests   (część `npm test`)
 *
 * Migracja Supabase uruchomiona na prawdziwym Postgresie (PGlite, WebAssembly) z atrapą schematu `auth`.
 * Sprawdza: składnię, idempotencję, RLS (izolacja użytkowników), trigger LWW, usunięcie konta.
 */
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIGRATION = fs.readFileSync(
  path.join(__dirname, '../migrations/20261114120000_init.sql'),
  'utf8',
);

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  grant usage on schema public to authenticated, anon;
`;

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function setup() {
  const db = new PGlite();
  await db.exec(AUTH_STUB);
  await db.exec(MIGRATION);
  await db.exec(
    `insert into auth.users (id, email) values ('${A}', 'a@x.pl'), ('${B}', 'b@x.pl');`,
  );
  return db;
}

async function as(db, user, fn) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

describe('migracja Supabase', () => {
  it('jest idempotentna', async () => {
    const db = await setup();
    await db.exec(MIGRATION);
  });

  it('RLS: użytkownik widzi i zmienia tylko swoje wiersze', async () => {
    const db = await setup();
    await as(db, A, () =>
      db.query(
        `insert into public.day_logs (id, date, catches, updated_at) values ($1, '2026-11-10', 3, now())`,
        [id(1)],
      ),
    );
    const seenByB = await as(db, B, () => db.query('select * from public.day_logs'));
    assert.equal(seenByB.rows.length, 0);

    const upd = await as(db, B, () =>
      db.query(`update public.day_logs set catches = 99 where id = $1`, [id(1)]),
    );
    assert.equal(upd.affectedRows, 0);

    // Wstawienie wiersza w imieniu innego użytkownika jest odrzucane.
    await assert.rejects(
      as(db, B, () =>
        db.query(
          `insert into public.day_logs (id, user_id, date, updated_at) values ($1, $2, '2026-11-11', now())`,
          [id(2), A],
        ),
      ),
      /row-level security/,
    );

    const seenByA = await as(db, A, () => db.query('select catches from public.day_logs'));
    assert.deepEqual(seenByA.rows, [{ catches: 3 }]);
  });

  it('brak dostępu dla anonimowych i brak twardego usuwania', async () => {
    const db = await setup();
    await db.exec(`set role anon`);
    await assert.rejects(db.query('select * from public.exercises'), /permission denied/);
    await db.exec(`reset role`);
    await assert.rejects(
      as(db, A, () => db.query('delete from public.exercises')),
      /permission denied/,
    );
  });

  it('LWW: starsza zmiana nie nadpisuje nowszej, server_updated_at rośnie', async () => {
    const db = await setup();
    const upsert = (minutes, updatedAt) =>
      as(db, A, () =>
        db.query(
          `insert into public.exercises (id, name, slot, minutes, updated_at)
           values ($1, 'Ć1', 'morning', $2, $3)
           on conflict (id) do update set minutes = excluded.minutes, updated_at = excluded.updated_at`,
          [id(5), minutes, updatedAt],
        ),
      );
    const read = () =>
      as(db, A, () => db.query('select minutes, server_updated_at from public.exercises'));

    await upsert(5, '2026-11-10T10:00:00Z');
    const first = (await read()).rows[0];
    await upsert(9, '2026-11-10T12:00:00Z');
    const second = (await read()).rows[0];
    assert.equal(second.minutes, 9);
    assert.ok(second.server_updated_at.getTime() > first.server_updated_at.getTime());

    await upsert(2, '2026-11-10T11:00:00Z'); // starsza – ignorowana
    assert.equal((await read()).rows[0].minutes, 9);
  });

  it('nie da się przejąć cudzego wiersza zmieniając user_id', async () => {
    const db = await setup();
    await as(db, A, () =>
      db.query(
        `insert into public.catch_events (id, date, updated_at) values ($1, '2026-11-10', now())`,
        [id(7)],
      ),
    );
    // Trigger przywraca właściciela – zmiana user_id jest po cichu ignorowana.
    await as(db, A, () =>
      db.query(
        `update public.catch_events set user_id = $1, updated_at = now() + interval '1 day' where id = $2`,
        [B, id(7)],
      ),
    );
    const owner = await db.query('select user_id from public.catch_events where id = $1', [id(7)]);
    assert.deepEqual(owner.rows, [{ user_id: A }]);
    assert.equal(
      (await as(db, B, () => db.query('select * from public.catch_events'))).rows.length,
      0,
    );
  });

  it('delete_my_account usuwa konto i wszystkie dane (kaskada)', async () => {
    const db = await setup();
    await as(db, A, async () => {
      await db.query(`insert into public.settings (catch_goal) values (6)`);
      await db.query(
        `insert into public.exercise_completions (id, exercise_id, date, updated_at) values ($1, $2, '2026-11-10', now())`,
        [id(8), id(5)],
      );
      await db.query('select public.delete_my_account()');
    });
    const users = await db.query('select id from auth.users');
    assert.deepEqual(users.rows, [{ id: B }]);
    assert.equal((await db.query('select * from public.settings')).rows.length, 0);
    assert.equal((await db.query('select * from public.exercise_completions')).rows.length, 0);
  });
});
