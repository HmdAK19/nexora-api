import { createHmac, timingSafeEqual } from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(bytes: Uint8Array): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let encoded = '';
  for (let index = 0; index < bits.length; index += 5) {
    encoded += alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return encoded;
}

function decodeBase32(value: string): Buffer {
  const bits = [...value.replace(/=+$/g, '').toUpperCase()]
    .map((character) => {
      const index = alphabet.indexOf(character);
      if (index < 0) throw new Error('INVALID_BASE32');
      return index.toString(2).padStart(5, '0');
    })
    .join('');
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotp(secret: string, timestamp = Date.now()): string {
  const counter = Math.floor(timestamp / 30_000);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return binary.toString().padStart(6, '0');
}

export function verifyTotp(secret: string, code: string, timestamp = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const supplied = Buffer.from(code);
  return [-1, 0, 1].some((window) => {
    const expected = Buffer.from(generateTotp(secret, timestamp + window * 30_000));
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}
