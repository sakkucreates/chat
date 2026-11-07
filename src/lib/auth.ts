// HMAC-SHA256 signed session token generator and CSRF verification utility
// Runs in all modern edge and Node.js environments using the standard Web Crypto API

const SESSION_SECRET = process.env.SESSION_SECRET || 'lumachat_master_hmac_secret_key_2026_secure';
const SESSION_COOKIE_NAME = 'lumachat_session';

function getSubtle(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    return nodeCrypto.webcrypto?.subtle || nodeCrypto.subtle;
  } catch {
    throw new Error('Web Crypto API (subtle) not available in this environment');
  }
}

// Convert string to BufferSource
function strToBytes(str: string): BufferSource {
  return new TextEncoder().encode(str) as unknown as BufferSource;
}

// Convert BufferSource to Base64URL
function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array | BufferSource): string {
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  let base64 = '';
  if (typeof window !== 'undefined' && window.btoa) {
    base64 = window.btoa(binary);
  } else {
    base64 = Buffer.from(binary, 'binary').toString('base64');
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert Base64URL to BufferSource
function base64UrlToBytes(base64url: string): BufferSource {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = typeof window !== 'undefined' && window.atob
    ? window.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes as unknown as BufferSource;
}

let hmacKeyPromise: Promise<CryptoKey> | null = null;
async function getHmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    const subtle = getSubtle();
    hmacKeyPromise = subtle.importKey(
      'raw',
      strToBytes(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }
  return hmacKeyPromise;
}

export interface SessionPayload {
  userId: string;
  role: 'admin' | 'user';
  name: string;
  code: string;
  exp: number; // Unix timestamp in seconds
}

// Sign payload into compact JWT-like token (payload.signature)
export async function createSessionToken(payload: Omit<SessionPayload, 'exp'>, expiresInSeconds: number = 86400 * 7): Promise<string> {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };
  const payloadStr = JSON.stringify(fullPayload);
  const payloadBase64Url = bufferToBase64Url(strToBytes(payloadStr));

  const key = await getHmacKey();
  const subtle = getSubtle();
  const sigBuffer = await subtle.sign(
    'HMAC',
    key,
    strToBytes(payloadBase64Url)
  );
  const sigBase64Url = bufferToBase64Url(sigBuffer);

  return `${payloadBase64Url}.${sigBase64Url}`;
}

// Verify and decode session token
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64Url, sigBase64Url] = parts;
  try {
    const key = await getHmacKey();
    const subtle = getSubtle();
    const sigBytes = base64UrlToBytes(sigBase64Url);
    const isValid = await subtle.verify(
      'HMAC',
      key,
      sigBytes as unknown as BufferSource,
      strToBytes(payloadBase64Url)
    );

    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(base64UrlToBytes(payloadBase64Url));
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

// Parse cookie string into key-value map
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const map: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [key, ...vals] = part.trim().split('=');
    if (key) {
      map[key] = decodeURIComponent(vals.join('='));
    }
  });
  return map;
}

// Cookie options for HttpOnly, Secure session cookie
export function getSessionCookieHeader(token: string, maxAgeSeconds: number = 86400 * 7): string {
  const isProd = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${isProd ? '; Secure' : ''}`;
}

export function getClearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// Double-Submit / Same-Origin CSRF Protection
export function verifyCsrf(request: Request): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
    return true;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
    } catch {}
  }

  // Also accept custom header
  const customHeader = request.headers.get('x-requested-with') || request.headers.get('x-lumachat-request');
  if (customHeader) return true;

  // Double submit token match
  const cookies = parseCookies(request.headers.get('cookie'));
  const headerCsrf = request.headers.get('x-csrf-token');
  if (headerCsrf && cookies['lumachat_csrf'] && headerCsrf === cookies['lumachat_csrf']) {
    return true;
  }

  // Fallback safe for GET requests
  return request.method === 'GET' || request.method === 'HEAD';
}

// Sliding window in-memory rate limiter for passcode verification
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(ipOrKey: string, maxAttempts: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ipOrKey) || [];
  const validTimestamps = timestamps.filter(t => now - t < windowMs);

  if (validTimestamps.length >= maxAttempts) {
    rateLimitMap.set(ipOrKey, validTimestamps);
    return { allowed: false, remaining: 0 };
  }

  validTimestamps.push(now);
  rateLimitMap.set(ipOrKey, validTimestamps);
  return { allowed: true, remaining: maxAttempts - validTimestamps.length };
}
