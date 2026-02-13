import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { APP_PASSWORD, SESSION_COOKIE_NAME, SESSION_TOKEN } from "./config";

export function isValidPassword(input: string): boolean {
  const expected = Buffer.from(APP_PASSWORD);
  const actual = Buffer.from(input);
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

export function getExpectedSessionToken(): string {
  return SESSION_TOKEN;
}

export function hasValidSessionCookie(): boolean {
  const store = cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  return token === getExpectedSessionToken();
}
