import { CLIENT_SECRET_STORAGE_KEY } from "./config";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EncryptedPayload = {
  iv: string;
  salt: string;
  cipherText: string;
};

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomSecret(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return toBase64(bytes);
}

export function getOrCreateClientSecret(): string {
  const existing = localStorage.getItem(CLIENT_SECRET_STORAGE_KEY);
  if (existing) return existing;

  const created = randomSecret();
  localStorage.setItem(CLIENT_SECRET_STORAGE_KEY, created);
  return created;
}

async function deriveKey(secret: string, salt: Uint8Array) {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 120000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(plainText: string, secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt);

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, encoder.encode(plainText));

  return JSON.stringify({
    iv: toBase64(iv),
    salt: toBase64(salt),
    cipherText: toBase64(new Uint8Array(encrypted))
  } satisfies EncryptedPayload);
}

export async function decryptText(encryptedPayload: string, secret: string): Promise<string> {
  const payload = JSON.parse(encryptedPayload) as EncryptedPayload;
  const key = await deriveKey(secret, fromBase64(payload.salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) as BufferSource },
    key,
    fromBase64(payload.cipherText) as BufferSource
  );

  return decoder.decode(decrypted);
}
