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

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(plainText: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText)
  );

  const payload: EncryptedPayload = {
    iv: toBase64(iv),
    salt: toBase64(salt),
    cipherText: toBase64(new Uint8Array(encrypted))
  };

  return JSON.stringify(payload);
}

export async function decryptText(encryptedPayload: string, passphrase: string): Promise<string> {
  const payload = JSON.parse(encryptedPayload) as EncryptedPayload;
  const key = await deriveKey(passphrase, fromBase64(payload.salt));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.cipherText)
  );

  return decoder.decode(decrypted);
}
