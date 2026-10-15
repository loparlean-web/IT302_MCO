import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as ExpoCrypto from 'expo-crypto';
import nacl from 'tweetnacl';

// tweetnacl needs a secure random source; React Native does not provide one by default.
nacl.setPRNG((out, n) => {
  const bytes = ExpoCrypto.getRandomBytes(n);
  for (let i = 0; i < n; i++) out[i] = bytes[i];
});

// ─────────────────────────────────────────────────────────
// Byte helpers (pure JS so they work on Hermes, web and Node)
// ─────────────────────────────────────────────────────────
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const toBase64 = (bytes) => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    out +=
      B64[(n >> 18) & 63] +
      B64[(n >> 12) & 63] +
      (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') +
      (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
};

const fromBase64 = (str) => {
  const clean = String(str).replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buf = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = B64.indexOf(clean[i]);
    if (v < 0) throw new Error('Invalid base64');
    buf = ((buf << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 255;
    }
  }
  return out.subarray(0, o);
};

const utf8Encode = (str) => {
  const out = [];
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 63),
        0x80 | ((c >> 6) & 63),
        0x80 | (c & 63)
      );
  }
  return Uint8Array.from(out);
};

const utf8Decode = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let c;
    if (b < 0x80) c = b;
    else if (b < 0xe0) c = ((b & 31) << 6) | (bytes[i++] & 63);
    else if (b < 0xf0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else
      c =
        ((b & 7) << 18) |
        ((bytes[i++] & 63) << 12) |
        ((bytes[i++] & 63) << 6) |
        (bytes[i++] & 63);
    s += String.fromCodePoint(c);
  }
  return s;
};

const concat = (...arrays) => {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrays) {
    out.set(a, o);
    o += a.length;
  }
  return out;
};

// ─────────────────────────────────────────────────────────
// Key management
// ─────────────────────────────────────────────────────────
const KEY_NAME = 'hospital_enc_key_v1';
let keyPromise = null;

const readKey = () =>
  Platform.OS === 'web' ? AsyncStorage.getItem(KEY_NAME) : SecureStore.getItemAsync(KEY_NAME);

const writeKey = (value) =>
  Platform.OS === 'web'
    ? AsyncStorage.setItem(KEY_NAME, value)
    : SecureStore.setItemAsync(KEY_NAME, value);

// Created once, then cached. Concurrent first calls share one promise so only one key is made.
const getKey = () => {
  if (!keyPromise) {
    keyPromise = (async () => {
      const stored = await readKey();
      if (stored) return fromBase64(stored);
      const fresh = nacl.randomBytes(nacl.secretbox.keyLength);
      await writeKey(toBase64(fresh));
      return fresh;
    })().catch((e) => {
      keyPromise = null;
      throw e;
    });
  }
  return keyPromise;
};

// ─────────────────────────────────────────────────────────
// Symmetric encryption
// Stored format:  "enc1:" + base64( 24-byte nonce + ciphertext + 16-byte auth tag )
// ─────────────────────────────────────────────────────────
const PREFIX = 'enc1:';

export const isEncrypted = (value) => typeof value === 'string' && value.startsWith(PREFIX);

export async function encryptText(plain) {
  const key = await getKey();
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(utf8Encode(String(plain)), nonce, key);
  return PREFIX + toBase64(concat(nonce, box));
}

export async function decryptText(token) {
  if (!isEncrypted(token)) throw new Error('Not an encrypted value');
  const key = await getKey();
  const packed = fromBase64(token.slice(PREFIX.length));
  if (packed.length < nacl.secretbox.nonceLength + nacl.secretbox.overheadLength) {
    throw new Error('Encrypted value is too short');
  }
  const nonce = packed.subarray(0, nacl.secretbox.nonceLength);
  const box = packed.subarray(nacl.secretbox.nonceLength);
  const plain = nacl.secretbox.open(box, nonce, key);
  if (!plain) throw new Error('Decryption failed (wrong key or tampered data)');
  return utf8Decode(plain);
}

export const encryptJSON = (value) => encryptText(JSON.stringify(value));

export async function decryptJSON(token) {
  return JSON.parse(await decryptText(token));
}

// ─────────────────────────────────────────────────────────
// Password hashing (PBKDF2-HMAC-SHA512, RFC 8018) built on tweetnacl's SHA-512
// Stored format:  "pbkdf2$<iterations>$<base64 salt>$<base64 hash>"
// ─────────────────────────────────────────────────────────
const ITERATIONS = 10000;
const SHA512_BLOCK = 128;

const makeHmacSha512 = (key) => {
  const k = key.length > SHA512_BLOCK ? nacl.hash(key) : key;
  const ipad = new Uint8Array(SHA512_BLOCK).fill(0x36);
  const opad = new Uint8Array(SHA512_BLOCK).fill(0x5c);
  for (let i = 0; i < k.length; i++) {
    ipad[i] ^= k[i];
    opad[i] ^= k[i];
  }
  return (msg) => nacl.hash(concat(opad, nacl.hash(concat(ipad, msg))));
};

// A 64-byte output is exactly one SHA-512 block, so a single PBKDF2 block is enough.
const pbkdf2Sha512 = (password, salt, iterations) => {
  const hmac = makeHmacSha512(password);
  let u = hmac(concat(salt, Uint8Array.of(0, 0, 0, 1)));
  const t = u.slice();
  for (let i = 1; i < iterations; i++) {
    u = hmac(u);
    for (let j = 0; j < t.length; j++) t[j] ^= u[j];
  }
  return t;
};

// Lets the UI repaint (e.g. a spinner) before the CPU-heavy loop starts.
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

export const isPasswordHash = (value) => typeof value === 'string' && value.startsWith('pbkdf2$');

export async function hashPassword(password) {
  await nextTick();
  const salt = nacl.randomBytes(16);
  const hash = pbkdf2Sha512(utf8Encode(String(password)), salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (!isPasswordHash(stored)) return false;
  const [, iterations, salt, hash] = stored.split('$');
  await nextTick();
  const test = pbkdf2Sha512(utf8Encode(String(password)), fromBase64(salt), Number(iterations));
  return nacl.verify(test, fromBase64(hash)); // constant-time compare
}