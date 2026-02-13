import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { APP_PASSWORD, SESSION_COOKIE_NAME } from "./config";

function passwordHash(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function isValidPassword(input: string): boolean {
  const expected = Buffer.from(passwordHash(APP_PASSWORD));
  const actual = Buffer.from(passwordHash(input));
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

export function getExpectedSessionToken(): string {
  return passwordHash(APP_PASSWORD);
}

export function hasValidSessionCookie(): boolean {
  const store = cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  return token === getExpectedSessionToken();
}
