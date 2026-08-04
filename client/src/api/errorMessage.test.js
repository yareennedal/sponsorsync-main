import { describe, expect, it } from 'vitest';
import { getErrorMessage } from './errorMessage';

const FALLBACK = 'فشل تسجيل الدخول.';

describe('getErrorMessage', () => {
  it('prefers the server message when there is one', () => {
    const err = {
      response: { data: { error: { message: 'The email or password is incorrect.' } } },
    };
    expect(getErrorMessage(err, FALLBACK)).toBe('The email or password is incorrect.');
  });

  // The regression this exists for: a request that never reached the server used
  // to fall through to a credentials-flavoured message, so a dev API that was
  // still booting looked like a wrong password.
  it('reports a connection failure, not the domain fallback, when there is no response', () => {
    const netErr = { request: {}, response: undefined, code: 'ERR_NETWORK' };
    const msg = getErrorMessage(netErr, FALLBACK);
    expect(msg).not.toBe(FALLBACK);
    expect(msg).toMatch(/الخادم/);
  });

  it('treats a missing response as a connection failure even without an error code', () => {
    expect(getErrorMessage({ request: {} }, FALLBACK)).toMatch(/الخادم/);
  });

  it('falls back for an HTTP error whose body has no message', () => {
    expect(getErrorMessage({ response: { status: 500, data: {} } }, FALLBACK)).toBe(FALLBACK);
  });

  it('falls back for a non-Axios throw', () => {
    expect(getErrorMessage(new TypeError('boom'), FALLBACK)).toBe(FALLBACK);
    expect(getErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
