import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./config";
import { getExpectedSessionToken } from "./session";

export function requireSession(): boolean {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return token === getExpectedSessionToken();
}
