const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeCode(code: string): string {
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

export function generateCode(length = 6): string {
  if (length < 6) length = 6;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
