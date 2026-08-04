import { env } from '../config/env.js';

// Cookie options. secure:false in dev (HTTP); true when served over HTTPS.
// Defaults to false: an omitted flag should give the shorter session, not the longer one.
export function sessionCookieOptions(rememberMe = false) {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
  };
  if (rememberMe) {
    options.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  }
  return options;
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
  };
}

export function cookieName() {
  return env.sessionCookieName;
}
