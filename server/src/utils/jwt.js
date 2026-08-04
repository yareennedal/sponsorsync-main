import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Kept in step with the 30-day cookie maxAge in utils/cookies.js.
export const REMEMBER_ME_EXPIRES_IN = '30d';

// rememberMe must reach here, not just the cookie: a 30-day cookie wrapped around an 8-hour
// token logs the user out at hour 8 and leaves a dead cookie in the browser for 29 more days.
export function signToken(user, rememberMe = false) {
  return jwt.sign({ sub: user.id, v: user.tokenVersion }, env.jwtSecret, {
    expiresIn: rememberMe ? REMEMBER_ME_EXPIRES_IN : env.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
