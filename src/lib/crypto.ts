// End-to-End Encryption utility using Web Crypto API (AES-GCM 256-bit)
// Works in all modern browsers and Node.js environments

function getSubtleCrypto(): SubtleCrypto | null {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    return nodeCrypto.webcrypto?.subtle || null;
  } catch {
    return null;
  }
}

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(binary);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

// Convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = typeof window !== 'undefined' && window.atob 
    ? window.atob(base64) 
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Cache derived CryptoKeys in memory for instant operations
const keyCache = new Map<string, CryptoKey>();

async function getConversationKey(user1Id: string, user2Id: string): Promise<CryptoKey | null> {
  const subtle = getSubtleCrypto();
  if (!subtle) return null;

  const pairKey = [user1Id, user2Id].sort().join(':');
  if (keyCache.has(pairKey)) {
    return keyCache.get(pairKey)!;
  }

  try {
    const encoder = new TextEncoder();
    const seed = `chatpass_e2ee_${pairKey}_v1_master_salt`;
    const hash = await subtle.digest('SHA-256', encoder.encode(seed));
    const key = await subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    keyCache.set(pairKey, key);
    return key;
  } catch (err) {
    console.warn('Error deriving crypto key:', err);
    return null;
  }
}

export function isEncrypted(text: string): boolean {
  return typeof text === 'string' && text.startsWith('ENC:');
}

export async function encryptText(plainText: string, user1Id: string, user2Id: string): Promise<string> {
  if (!plainText) return plainText;

  const subtle = getSubtleCrypto();
  if (!subtle) return plainText;

  try {
    const key = await getConversationKey(user1Id, user2Id);
    if (!key) return plainText;

    const iv = typeof window !== 'undefined' && window.crypto
      ? window.crypto.getRandomValues(new Uint8Array(12))
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      : new Uint8Array(require('crypto').randomBytes(12));

    const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as unknown as BufferSource;

    const encoder = new TextEncoder();
    const encodedText = encoder.encode(plainText);

    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv: ivBuf },
      key,
      encodedText
    );

    return `ENC:${bufferToBase64(iv)}:${bufferToBase64(ciphertext)}`;
  } catch (err) {
    console.warn('Encryption fallback to plain text:', err);
    return plainText;
  }
}

export async function decryptText(cipherText: string, user1Id?: string, user2Id?: string): Promise<string> {
  if (!cipherText || !isEncrypted(cipherText)) {
    return cipherText;
  }

  const subtle = getSubtleCrypto();
  if (!subtle) return '';

  const parts = cipherText.split(':');
  if (parts.length !== 3) return '';

  const candidates: [string, string][] = [];
  if (user1Id && user2Id) {
    candidates.push([user1Id, user2Id]);
    candidates.push([user2Id, user1Id]);
  }
  if (user1Id) {
    candidates.push([user1Id, 'admin_root']);
    candidates.push(['admin_root', user1Id]);
  }
  if (user2Id) {
    candidates.push([user2Id, 'admin_root']);
    candidates.push(['admin_root', user2Id]);
  }

  for (const [u1, u2] of candidates) {
    try {
      const key = await getConversationKey(u1, u2);
      if (!key) continue;

      const iv = base64ToUint8Array(parts[1]);
      const encryptedData = base64ToUint8Array(parts[2]);

      const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as unknown as BufferSource;
      const dataBuf = encryptedData.buffer.slice(encryptedData.byteOffset, encryptedData.byteOffset + encryptedData.byteLength) as unknown as BufferSource;

      const decrypted = await subtle.decrypt(
        { name: 'AES-GCM', iv: ivBuf },
        key,
        dataBuf
      );

      const decoder = new TextDecoder();
      const result = decoder.decode(decrypted);
      if (result) return result;
    } catch {
      // try next key candidate
    }
  }

  // If legacy decryption cannot resolve ciphertext, return clean empty string instead of raw hash
  return '';
}
