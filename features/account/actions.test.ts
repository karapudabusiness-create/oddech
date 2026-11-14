import { mapAuthError } from './actions';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/lib/supabase', () => ({ supabase: null }));
jest.mock('@/sync/manager', () => ({ syncNow: jest.fn() }));

describe('mapAuthError – rozpoznawanie przyczyn', () => {
  const cases: [Parameters<typeof mapAuthError>[0], string][] = [
    [{ message: 'Invalid API key', status: 401 }, 'invalid-key'],
    [{ message: 'email rate limit exceeded', status: 429 }, 'rate-limit'],
    [
      {
        message: 'For security purposes, you can only request this after 42 seconds.',
        status: 429,
      },
      'rate-limit',
    ],
    [
      { message: 'Signups not allowed for otp', status: 422, code: 'otp_disabled' },
      'signups-disabled',
    ],
    [{ message: 'Error sending magic link email', status: 500 }, 'email-send'],
    [
      { message: 'Token has expired or is invalid', status: 403, code: 'otp_expired' },
      'invalid-code',
    ],
    [{ message: 'Network request failed' }, 'network'],
    [{ message: 'Something odd', status: 500 }, 'other'],
  ];
  it.each(cases)('%j → %s', (input, code) => {
    const err = mapAuthError(input);
    expect(err.code).toBe(code);
    expect(err.detail).toContain(input!.message!);
  });
});
