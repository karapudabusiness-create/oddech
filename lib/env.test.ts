import { blockingUrlIssue, supabaseBaseUrl, supabaseUrlIssue } from './env';

it('rozpoznaje typowe pomyłki w adresie Supabase', () => {
  expect(supabaseUrlIssue('https://abcdefghijklmnop.supabase.co')).toBeNull();
  expect(supabaseUrlIssue('https://abcdefghijklmnop.supabase.co/')).toBeNull();
  expect(supabaseUrlIssue('https://supabase.com/dashboard/project/abcdefghijklmnop')).toBe(
    'dashboard',
  );
  expect(supabaseUrlIssue('https://abcdefghijklmnop.supabase.co/rest/v1/')).toBe('path');
  expect(supabaseUrlIssue('"https://abcdefghijklmnop.supabase.co"')).toBe('quotes');
  expect(supabaseUrlIssue('abcdefghijklmnop.supabase.co')).toBe('not-https');
});

it('obcina ścieżkę i cudzysłowy z adresu *.supabase.co', () => {
  expect(supabaseBaseUrl('https://abcd.supabase.co/rest/v1/')).toBe('https://abcd.supabase.co');
  expect(supabaseBaseUrl('"https://abcd.supabase.co"')).toBe('https://abcd.supabase.co');
  expect(supabaseBaseUrl('https://api.example.com/')).toBe('https://api.example.com');
  expect(blockingUrlIssue('https://abcd.supabase.co/rest/v1/')).toBeNull();
  expect(blockingUrlIssue('https://supabase.com/dashboard/project/abcd')).toBe('dashboard');
});
