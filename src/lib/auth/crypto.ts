const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    return Uint8Array.from(Buffer.from(value, 'base64url'));
  } catch {
    return null;
  }
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function sealAuthValue(value: unknown, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(secret), plaintext);
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function unsealAuthValue<T>(value: string, secret: string): Promise<T | null> {
  try {
    const parts = value.split('.');
    if (parts.length !== 2) return null;
    const iv = fromBase64Url(parts[0]);
    const ciphertext = fromBase64Url(parts[1]);
    if (!iv || iv.byteLength !== 12 || !ciphertext || ciphertext.byteLength === 0) return null;

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      await encryptionKey(secret),
      ciphertext,
    );
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch {
    return null;
  }
}
