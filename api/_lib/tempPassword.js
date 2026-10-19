// ---------------------------------------------------------------------------
// Temporary passwords issued by an administrator (and by the migration
// script). Cryptographically random, unambiguous characters (no 0/O, 1/l/I),
// and always containing upper case, lower case, a digit and a symbol so the
// person can sign in with it under any reasonable password policy. They are
// shown once and must be changed at first sign-in (must_change_password).
// ---------------------------------------------------------------------------

import { randomInt } from 'node:crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGIT = '23456789';
const SYMBOL = '!@#$%&*?';
const ALL = UPPER + LOWER + DIGIT + SYMBOL;

export const TEMP_PASSWORD_LENGTH = 14;

const pick = (set) => set[randomInt(set.length)];

export function generateTempPassword(length = TEMP_PASSWORD_LENGTH) {
  const n = Math.max(length, 12);
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < n) chars.push(pick(ALL));
  // Fisher–Yates with a CSPRNG, so the guaranteed classes are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
