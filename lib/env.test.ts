import { supabaseUrlIssue } from './env';

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
