import { describe, expect, it } from 'vitest';

import { generateTotp, verifyTotp } from './totp.js';

describe('RFC 6238 TOTP', () => {
  it('matches the RFC SHA-1 test secret at 59 seconds', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(generateTotp(secret, 59_000)).toBe('287082');
    expect(verifyTotp(secret, '287082', 59_000)).toBe(true);
    expect(verifyTotp(secret, '000000', 59_000)).toBe(false);
  });
});
